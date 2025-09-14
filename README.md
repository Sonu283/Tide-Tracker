# Tide Tracker

Tide Tracker is a web application that helps users track tides, weather, and get activity recommendations based on real-time location.  
It consists of a **FastAPI backend** and a **React + Tailwind CSS frontend**.

---

## Features

- Real-time tide data (high and low tides).
- Weather updates for the selected location.
- Location-based tide tracking (using user’s real-time coordinates).
- Interactive tide charts.
- Map view integration.
- Activity recommendations based on tide and weather conditions.
- Error handling with fallbacks and loading states.

---

## Tech Stack

### Backend
- Python
- FastAPI
- Requests
- Uvicorn
- CORS middleware

### Frontend
- React.js
- Tailwind CSS
- Chart.js (for tide chart visualization)


### API KEYS
1. WorldTides API (for tide data)
Go to: https://www.worldtides.info/apidocs

2. OpenWeather API (for weather data)
Go to: https://home.openweathermap.org/users/sign_up
---

## Project Structure
```bash
TIDE-TRACKER/
│
├── backend/ # FastAPI backend
│ ├── main.py
│ └── requirements.txt
│
├── frontend/ # React + Tailwind frontend
│ ├── public/
│ ├── src/
│ │ ├── components/
│ │ │ ├── ActivityRecommendations.jsx
│ │ │ ├── ErrorBoundary.jsx
│ │ │ ├── LoadingSpinner.jsx
│ │ │ ├── LocationSettings.jsx
│ │ │ ├── MapView.jsx
│ │ │ ├── TideChart.jsx
│ │ │ └── WeatherCard.jsx
│ │ ├── App.js
│ │ ├── index.js
│ │ └── index.css
│ ├── package.json
│ ├── tailwind.config.js
│ └── postcss.config.js
│
├── .env # Environment variables
└── README.md
```

---

## Setup Instructions

### 1. Clone the Repository
```bash
git clone https://github.com/Sonu283/Tide-Tracker.git
cd tide-tracker
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```
The backend will start on http://0.0.0.0:8000.

### 3. Frontend Setup
```bash
cd ../frontend
npm install
npm start
```
The frontend will start on http://localhost:3000.

## Environment Variables

Create a .env file in the project root. Example:
```bash
WORLD_TIDES_API_KEY = YOUR_WORLD_TIDES_API_KEY
OPENWEATHER_API_KEY = YOUR_OPENWEATHER_API_KEY
REACT_APP_API_URL = YOUR_REACT_APP_API_URL_BACKEND
```

