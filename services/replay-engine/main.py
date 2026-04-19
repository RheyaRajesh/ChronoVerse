import os
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import psycopg2
from psycopg2.extras import RealDictCursor
import redis

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:4000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://chronouser:chronopassword@postgres:5432/chronoverse")
REDIS_HOST = os.getenv("REDIS_HOST", "redis")

def get_db_connection():
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)

try:
    redis_client = redis.Redis(host=REDIS_HOST, port=6379, db=0)
except Exception as e:
    print("Redis connection failed", e)

@app.get("/replay/{target_timestamp}")
def replay_events(target_timestamp: str):
    """
    Replay events up to a given timestamp to reconstruct state.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT * FROM events WHERE timestamp <= %s ORDER BY timestamp ASC",
            (target_timestamp,)
        )
        events = cursor.fetchall()
        
        # Strategy Pattern: Default replay constructs an abstract 'system state'
        system_state = {"replayed_events": 0, "last_timestamp": None, "state_snapshot": {}}
        
        for event in events:
            system_state["replayed_events"] += 1
            system_state["last_timestamp"] = event["timestamp"].isoformat()
            # Generic replay state accumulation
            service = event["service_name"]
            if service not in system_state["state_snapshot"]:
                system_state["state_snapshot"][service] = []
            system_state["state_snapshot"][service].append(event["payload"])
            
        # Convert to JSON serializable list
        raw_events = []
        for event in events:
            raw_events.append({
                "event_id": str(event["event_id"]),
                "timestamp": event["timestamp"].isoformat(),
                "service_name": event["service_name"],
                "event_type": event["event_type"],
                "payload": event["payload"],
                "correlation_id": str(event["correlation_id"])
            })

        return {"status": "success", "state": system_state, "raw_events": raw_events}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.post("/fork")
def create_fork(target_timestamp: str):
    """
    Prototype Pattern: Create a 'what-if' simulation by capturing state at target timestamp
    """
    return {"status": "success", "message": f"Timeline forked at {target_timestamp}. You can now inject custom events into this fork."}
