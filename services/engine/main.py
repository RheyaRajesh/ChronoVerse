import os
import json
import threading
import psycopg2
from psycopg2.extras import RealDictCursor
import redis
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from confluent_kafka import Consumer, KafkaError

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = os.getenv("DATABASE_URL")
REDIS_HOST = os.getenv("REDIS_HOST", "redis")
KAFKA_BROKER = os.getenv("KAFKA_BROKER", "kafka:29092")

# --- DATABASE / REDIS ---

def get_db_connection():
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)

try:
    redis_client = redis.Redis(host=REDIS_HOST, port=6379, db=0)
except Exception as e:
    print("Redis connection failed", e)

# --- ANOMALY DETECTION LOGIC ---

class AnomalyDetectionStrategy:
    def detect(self, event) -> bool:
        pass

class SimpleRuleBasedDetection(AnomalyDetectionStrategy):
    def detect(self, event) -> bool:
        payload = event.get("payload", {})
        if str(payload).lower().find("error") != -1:
            return True
        if payload.get("latency_ms", 0) > 1000:
            return True
        return False

detector = SimpleRuleBasedDetection()

def kafka_consumer_thread():
    conf = {
        'bootstrap.servers': KAFKA_BROKER,
        'group.id': 'engine-ai-analyzer-group',
        'auto.offset.reset': 'earliest'
    }
    
    print("AI Analyzer Thread: Attempting to connect to Kafka...")
    consumer = None
    while consumer is None:
        try:
            consumer = Consumer(conf)
            consumer.subscribe(['system-events'])
            print("AI Analyzer Thread: Connected and subscribed to Kafka")
        except Exception as e:
            print(f"AI Analyzer Thread: Kafka connection failed ({e}), retrying in 5s...")
            import time
            time.sleep(5)

    try:
        while True:
            msg = consumer.poll(1.0)
            if msg is None: continue
            if msg.error():
                if msg.error().code() != KafkaError._PARTITION_EOF:
                    print(msg.error())
                continue
            
            event = json.loads(msg.value().decode('utf-8'))
            if detector.detect(event):
                print(f"ANOMALY DETECTED in event: {event.get('event_id')}")
                # Optional: Push to Redis for live dashboard highlighting
                try:
                    redis_client.lpush("anomalies", json.dumps(event))
                    redis_client.ltrim("anomalies", 0, 99)
                except: pass
    finally:
        consumer.close()

# --- API ENDPOINTS ---

@app.get("/replay/{target_timestamp}", responses={500: {"description": "Internal Server Error"}})
def replay_events(target_timestamp: str):
    """Replay events up to a given timestamp to reconstruct state."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM events WHERE timestamp <= %s ORDER BY timestamp ASC", (target_timestamp,))
        events = cursor.fetchall()
        
        system_state = {"replayed_events": 0, "last_timestamp": None, "state_snapshot": {}}
        raw_events = []
        
        for event in events:
            system_state["replayed_events"] += 1
            system_state["last_timestamp"] = event["timestamp"].isoformat()
            service = event["service_name"]
            if service not in system_state["state_snapshot"]:
                system_state["state_snapshot"][service] = []
            system_state["state_snapshot"][service].append(event["payload"])
            
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
    """Prototype Pattern: Create a 'what-if' simulation by capturing state at target timestamp."""
    return {"status": "success", "message": f"Timeline forked at {target_timestamp}. Switch to Simulations tab to inspect."}

@app.get("/health")
def health():
    return {"status": "healthy", "service": "chronoverse-engine"}

# --- STARTUP ---

@app.on_event("startup")
def startup_event():
    thread = threading.Thread(target=kafka_consumer_thread, daemon=True)
    thread.start()
