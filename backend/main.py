from fastapi import FastAPI, Query, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, validator
from typing import Optional, List, Dict, Any
import requests
from datetime import datetime, timedelta
import pytz
import os
import logging
from dotenv import load_dotenv
import asyncio
import aiohttp
from functools import lru_cache
import json

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Tide Information API",
    description="Comprehensive tide and weather information service",
    version="2.0.0"
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change to specific domains in production
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# API Configuration
WORLD_TIDES_API = "https://www.worldtides.info/api/v3"
WEATHER_API = "https://api.openweathermap.org/data/2.5/weather"
WEATHER_FORECAST_API = "https://api.openweathermap.org/data/2.5/forecast"

TIDES_API_KEY = os.getenv("WORLD_TIDES_API_KEY")
WEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")

# Cache configuration
CACHE_DURATION = 1800 
cache_store = {}

# Pydantic models for request validation
class LocationModel(BaseModel):
    lat: float
    lon: float
    
    @validator('lat')
    def validate_latitude(cls, v):
        if not -90 <= v <= 90:
            raise ValueError('Latitude must be between -90 and 90 degrees')
        return v
    
    @validator('lon')
    def validate_longitude(cls, v):
        if not -180 <= v <= 180:
            raise ValueError('Longitude must be between -180 and 180 degrees')
        return v

class TideResponse(BaseModel):
    lat: float
    lon: float
    location_name: Optional[str]
    next_tides: List[Dict[str, Any]]
    daily_summary: Dict[str, Any]
    weather: Dict[str, Any]
    marine_conditions: Dict[str, Any]
    recommendations: Dict[str, Any]
    last_updated: str

# Utility functions
def get_cache_key(lat: float, lon: float, data_type: str) -> str:
    """Generate cache key for API responses"""
    return f"{data_type}_{lat}_{lon}"

def is_cache_valid(cache_entry: Dict) -> bool:
    """Check if cache entry is still valid"""
    if not cache_entry:
        return False
    cache_time = datetime.fromisoformat(cache_entry['timestamp'])
    return (datetime.now() - cache_time).seconds < CACHE_DURATION

@lru_cache(maxsize=100)
def get_timezone_from_coords(lat: float, lon: float) -> str:
    """Get timezone from coordinates (cached for performance)"""
    try:
        # Simple timezone approximation based on longitude
        tz_offset = int(lon / 15)
        if tz_offset < -12:
            tz_offset = -12
        elif tz_offset > 14:
            tz_offset = 14
        
        # Map to common timezone names
        tz_map = {
            -12: "Pacific/Auckland", -11: "Pacific/Midway", -10: "Pacific/Honolulu",
            -9: "America/Anchorage", -8: "America/Los_Angeles", -7: "America/Denver",
            -6: "America/Chicago", -5: "America/New_York", -4: "America/Halifax",
            -3: "America/Sao_Paulo", -2: "America/Noronha", -1: "Atlantic/Azores",
            0: "UTC", 1: "Europe/London", 2: "Europe/Berlin", 3: "Europe/Moscow",
            4: "Asia/Dubai", 5: "Asia/Karachi", 6: "Asia/Dhaka", 7: "Asia/Bangkok",
            8: "Asia/Shanghai", 9: "Asia/Tokyo", 10: "Australia/Sydney",
            11: "Pacific/Norfolk", 12: "Pacific/Fiji", 13: "Pacific/Tongatapu",
            14: "Pacific/Kiritimati"
        }
        return tz_map.get(tz_offset, "UTC")
    except Exception:
        return "UTC"

async def fetch_tide_data(lat: float, lon: float) -> Dict[str, Any]:
    """Fetch comprehensive tide data"""
    if not TIDES_API_KEY:
        raise HTTPException(status_code=500, detail="Missing WORLD_TIDES_API_KEY")
    
    cache_key = get_cache_key(lat, lon, "tides")
    if cache_key in cache_store and is_cache_valid(cache_store[cache_key]):
        return cache_store[cache_key]['data']
    
    try:
        # Get current date and next 2 days
        now = datetime.now()
        end_date = now + timedelta(days=2)
        
        params = {
            "extremes": "",
            "heights": "",
            "lat": lat,
            "lon": lon,
            "key": TIDES_API_KEY,
            "start": int(now.timestamp()),
            "length": 172800,  # 48 hours in seconds
            "step": 3600  # 1 hour intervals
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(WORLD_TIDES_API, params=params) as response:
                if response.status != 200:
                    raise HTTPException(status_code=500, detail="Failed to fetch tide data")
                data = await response.json()
        
        # Cache the response
        cache_store[cache_key] = {
            'data': data,
            'timestamp': datetime.now().isoformat()
        }
        
        return data
    except aiohttp.ClientError as e:
        logger.error(f"Error fetching tide data: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch tide data")

async def fetch_weather_data(lat: float, lon: float) -> Dict[str, Any]:
    """Fetch current weather and forecast data"""
    if not WEATHER_API_KEY:
        return {}
    
    cache_key = get_cache_key(lat, lon, "weather")
    if cache_key in cache_store and is_cache_valid(cache_store[cache_key]):
        return cache_store[cache_key]['data']
    
    try:
        async with aiohttp.ClientSession() as session:
            # Current weather
            current_params = {
                "lat": lat,
                "lon": lon,
                "appid": WEATHER_API_KEY,
                "units": "metric"
            }
            async with session.get(WEATHER_API, params=current_params) as response:
                current_weather = await response.json() if response.status == 200 else {}
            
            # 5-day forecast
            forecast_params = {
                "lat": lat,
                "lon": lon,
                "appid": WEATHER_API_KEY,
                "units": "metric",
                "cnt": 8  # Next 24 hours (3-hour intervals)
            }
            async with session.get(WEATHER_FORECAST_API, params=forecast_params) as response:
                forecast_data = await response.json() if response.status == 200 else {}
        
        weather_info = {
            "current": current_weather,
            "forecast": forecast_data
        }
        
        # Cache the response
        cache_store[cache_key] = {
            'data': weather_info,
            'timestamp': datetime.now().isoformat()
        }
        
        return weather_info
    except aiohttp.ClientError as e:
        logger.error(f"Error fetching weather data: {e}")
        return {}

def process_tide_data(tide_data: Dict, timezone_str: str) -> Dict[str, Any]:
    """Process and format tide data"""
    try:
        user_tz = pytz.timezone(timezone_str)
    except Exception:
        user_tz = pytz.UTC
    
    processed_data = {
        "next_tides": [],
        "daily_summary": {}
    }
    
    if "extremes" in tide_data:
        # Process next extremes
        for tide in tide_data["extremes"][:6]:  # Next 6 tides
            dt = datetime.fromisoformat(tide["date"]).astimezone(user_tz)
            processed_data["next_tides"].append({
                "type": tide["type"].title(),
                "height": round(tide.get("height", 0), 2),
                "time": dt.strftime("%Y-%m-%d %H:%M:%S"),
                "relative_time": get_relative_time(dt)
            })
        
        # Calculate daily summary
        high_tides = [t for t in tide_data["extremes"] if t["type"] == "High"]
        low_tides = [t for t in tide_data["extremes"] if t["type"] == "Low"]
        
        processed_data["daily_summary"] = {
            "high_tides_count": len([t for t in high_tides if is_today(t["date"], user_tz)]),
            "low_tides_count": len([t for t in low_tides if is_today(t["date"], user_tz)]),
            "max_height": round(max([t.get("height", 0) for t in high_tides[:4]], default=0), 2),
            "min_height": round(min([t.get("height", 0) for t in low_tides[:4]], default=0), 2)
        }
    
    return processed_data

def process_weather_data(weather_data: Dict) -> Dict[str, Any]:
    """Process and format weather data"""
    if not weather_data:
        return {}
    
    current = weather_data.get("current", {})
    forecast = weather_data.get("forecast", {})
    
    processed = {}
    
    if current:
        processed["current"] = {
            "condition": current.get("weather", [{}])[0].get("description", "").title(),
            "temperature": round(current.get("main", {}).get("temp", 0), 1),
            "feels_like": round(current.get("main", {}).get("feels_like", 0), 1),
            "humidity": current.get("main", {}).get("humidity", 0),
            "pressure": current.get("main", {}).get("pressure", 0),
            "visibility": current.get("visibility", 0) / 1000 if current.get("visibility") else None,
            "wind_speed": current.get("wind", {}).get("speed", 0),
            "wind_direction": current.get("wind", {}).get("deg", 0),
            "location_name": current.get("name", "")
        }
    
    if forecast and "list" in forecast:
        processed["forecast"] = []
        for item in forecast["list"][:4]:  # Next 12 hours
            dt = datetime.fromtimestamp(item["dt"])
            processed["forecast"].append({
                "time": dt.strftime("%H:%M"),
                "condition": item["weather"][0]["description"].title(),
                "temperature": round(item["main"]["temp"], 1),
                "wind_speed": item["wind"]["speed"],
                "precipitation": item.get("rain", {}).get("3h", 0) + item.get("snow", {}).get("3h", 0)
            })
    
    return processed

def get_marine_conditions(weather_data: Dict, tide_data: Dict) -> Dict[str, Any]:
    """Analyze marine conditions for activities"""
    conditions = {
        "overall_rating": "Unknown",
        "suitability": {},
        "warnings": []
    }
    
    if not weather_data or "current" not in weather_data:
        return conditions
    
    current = weather_data["current"]
    wind_speed = current.get("wind_speed", 0)
    temperature = current.get("temperature", 0)
    visibility = current.get("visibility", 10)
    
    # Rate conditions for different activities
    conditions["suitability"] = {
        "swimming": get_swimming_suitability(temperature, wind_speed),
        "surfing": get_surfing_suitability(wind_speed, tide_data),
        "fishing": get_fishing_suitability(wind_speed, tide_data),
        "boating": get_boating_suitability(wind_speed, visibility)
    }
    
    # Overall rating
    ratings = list(conditions["suitability"].values())
    avg_rating = sum(r for r in ratings if isinstance(r, (int, float))) / len(ratings) if ratings else 0
    
    if avg_rating >= 8:
        conditions["overall_rating"] = "Excellent"
    elif avg_rating >= 6:
        conditions["overall_rating"] = "Good"
    elif avg_rating >= 4:
        conditions["overall_rating"] = "Fair"
    else:
        conditions["overall_rating"] = "Poor"
    
    # Add warnings
    if wind_speed > 10:
        conditions["warnings"].append("Strong winds - exercise caution")
    if temperature < 10:
        conditions["warnings"].append("Cold temperature - consider thermal protection")
    if visibility and visibility < 2:
        conditions["warnings"].append("Low visibility conditions")
    
    return conditions

def generate_recommendations(tide_data: Dict, weather_data: Dict, marine_conditions: Dict) -> Dict[str, Any]:
    """Generate activity recommendations"""
    recommendations = {
        "best_activity": "General observation",
        "best_time": "Current time",
        "tips": [],
        "optimal_conditions": {}
    }
    
    if not tide_data.get("next_tides"):
        return recommendations
    
    next_tide = tide_data["next_tides"][0]
    current_weather = weather_data.get("current", {})
    
    # Determine best activity based on conditions
    if marine_conditions.get("suitability", {}).get("surfing", 0) >= 7:
        if next_tide["type"].lower() == "high":
            recommendations["best_activity"] = "Surfing"
            recommendations["tips"].append("High tide approaching - excellent surfing conditions")
    elif marine_conditions.get("suitability", {}).get("fishing", 0) >= 7:
        recommendations["best_activity"] = "Fishing"
        if next_tide["type"].lower() == "low":
            recommendations["tips"].append("Low tide period - fish often feed more actively")
    elif marine_conditions.get("suitability", {}).get("swimming", 0) >= 6:
        recommendations["best_activity"] = "Swimming"
    else:
        recommendations["best_activity"] = "Beach walking"
        if next_tide["type"].lower() == "low":
            recommendations["tips"].append("Low tide - great time for exploring tide pools")
    
    # Time recommendations
    recommendations["best_time"] = next_tide["time"]
    
    # General tips
    if current_weather.get("temperature", 0) > 25:
        recommendations["tips"].append("Warm conditions - stay hydrated and use sun protection")
    if current_weather.get("wind_speed", 0) < 5:
        recommendations["tips"].append("Calm winds - ideal for water activities")
    
    return recommendations

# Helper functions
def get_relative_time(target_time: datetime) -> str:
    """Get human-readable relative time"""
    now = datetime.now(target_time.tzinfo)
    diff = target_time - now
    
    if diff.total_seconds() < 0:
        return "Past"
    elif diff.total_seconds() < 3600:  # Less than 1 hour
        minutes = int(diff.total_seconds() / 60)
        return f"In {minutes} minutes"
    elif diff.total_seconds() < 86400:  # Less than 24 hours
        hours = int(diff.total_seconds() / 3600)
        return f"In {hours} hours"
    else:
        days = int(diff.total_seconds() / 86400)
        return f"In {days} days"

def is_today(date_str: str, timezone) -> bool:
    """Check if date is today in given timezone"""
    try:
        dt = datetime.fromisoformat(date_str).astimezone(timezone)
        now = datetime.now(timezone)
        return dt.date() == now.date()
    except Exception:
        return False

def get_swimming_suitability(temperature: float, wind_speed: float) -> int:
    """Rate swimming conditions (0-10)"""
    score = 5
    if temperature > 20:
        score += 2
    if temperature > 25:
        score += 2
    if wind_speed < 5:
        score += 1
    if temperature < 15:
        score -= 3
    if wind_speed > 15:
        score -= 2
    return max(0, min(10, score))

def get_surfing_suitability(wind_speed: float, tide_data: Dict) -> int:
    """Rate surfing conditions (0-10)"""
    score = 5
    if 5 <= wind_speed <= 15:
        score += 2
    if tide_data.get("next_tides") and tide_data["next_tides"][0]["type"].lower() == "high":
        score += 2
    if wind_speed > 20:
        score -= 3
    return max(0, min(10, score))

def get_fishing_suitability(wind_speed: float, tide_data: Dict) -> int:
    """Rate fishing conditions (0-10)"""
    score = 6
    if wind_speed < 10:
        score += 2
    if tide_data.get("next_tides"):
        next_tide = tide_data["next_tides"][0]
        if next_tide["type"].lower() == "low" and "In" in next_tide.get("relative_time", ""):
            score += 2
    if wind_speed > 15:
        score -= 2
    return max(0, min(10, score))

def get_boating_suitability(wind_speed: float, visibility: Optional[float]) -> int:
    """Rate boating conditions (0-10)"""
    score = 6
    if wind_speed < 8:
        score += 2
    if visibility and visibility > 5:
        score += 2
    if wind_speed > 12:
        score -= 3
    if visibility and visibility < 2:
        score -= 3
    return max(0, min(10, score))

# API Routes
@app.get("/", response_model=Dict[str, str])
def root():
    """API health check"""
    return {
        "service": "Tide Information API",
        "status": "operational",
        "version": "2.0.0",
        "endpoints": "/docs for API documentation"
    }

@app.get("/tides", response_model=TideResponse)
async def get_tides(
    lat: float = Query(..., ge=-90, le=90, description="Latitude in decimal degrees"),
    lon: float = Query(..., ge=-180, le=180, description="Longitude in decimal degrees"),
    timezone: Optional[str] = Query(None, description="Timezone (auto-detected if not provided)")
):
    """
    Get comprehensive tide information including weather and activity recommendations
    """
    try:
        # Auto-detect timezone if not provided
        if not timezone:
            timezone = get_timezone_from_coords(lat, lon)
        
        # Fetch data asynchronously
        tide_data_raw, weather_data_raw = await asyncio.gather(
            fetch_tide_data(lat, lon),
            fetch_weather_data(lat, lon)
        )
        
        # Process the data
        tide_data = process_tide_data(tide_data_raw, timezone)
        weather_data = process_weather_data(weather_data_raw)
        marine_conditions = get_marine_conditions(weather_data, tide_data)
        recommendations = generate_recommendations(tide_data, weather_data, marine_conditions)
        
        # Build response
        response = TideResponse(
            lat=lat,
            lon=lon,
            location_name=weather_data.get("current", {}).get("location_name", ""),
            next_tides=tide_data["next_tides"],
            daily_summary=tide_data["daily_summary"],
            weather=weather_data,
            marine_conditions=marine_conditions,
            recommendations=recommendations,
            last_updated=datetime.now().isoformat()
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Error processing tide request: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "tides_api": "configured" if TIDES_API_KEY else "missing_key",
            "weather_api": "configured" if WEATHER_API_KEY else "missing_key"
        },
        "cache_entries": len(cache_store)
    }

@app.post("/cache/clear")
def clear_cache():
    """Clear API cache (useful for testing)"""
    cache_store.clear()
    return {"message": "Cache cleared successfully"}
