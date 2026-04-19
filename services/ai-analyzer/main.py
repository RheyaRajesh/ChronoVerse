import os
import json
import threading
from fastapi import FastAPI
from confluent_kafka import Consumer, KafkaError

app = FastAPI()

KAFKA_BROKER = os.getenv("KAFKA_BROKER", "kafka:29092")

# Pluggable Strategy for Anomaly Detection
class AnomalyDetectionStrategy:
    def detect(self, event) -> bool:
        pass

class SimpleRuleBasedDetection(AnomalyDetectionStrategy):
    def detect(self, event) -> bool:
        # Example: if payload contains 'error' or latency > 1000
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
        'group.id': 'ai-analyzer-group',
        'auto.offset.reset': 'earliest'
    }
    consumer = Consumer(conf)
    consumer.subscribe(['system-events'])
    
    print("AI Analyzer subscribed to Kafka")
    try:
        while True:
            msg = consumer.poll(1.0)
            if msg is None:
                continue
            if msg.error():
                if msg.error().code() != KafkaError._PARTITION_EOF:
                    print(msg.error())
                continue
            
            event = json.loads(msg.value().decode('utf-8'))
            if detector.detect(event):
                print(f"ANOMALY DETECTED in event: {event.get('event_id')}")
                # Ideally, publish this to an 'anomalies' topic
    finally:
        consumer.close()

@app.on_event("startup")
def startup_event():
    thread = threading.Thread(target=kafka_consumer_thread, daemon=True)
    thread.start()

@app.get("/status")
def status():
    return {"status": "AI Analyzer is running"}
