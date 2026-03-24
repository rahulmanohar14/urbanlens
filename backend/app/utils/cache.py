import redis
import json
import hashlib
from functools import wraps

redis_client = redis.Redis(host="localhost", port=6379, db=0, decode_responses=True)


def cache_key(prefix, **kwargs):
    """Generate a unique cache key from prefix and parameters."""
    param_str = json.dumps(kwargs, sort_keys=True, default=str)
    param_hash = hashlib.md5(param_str.encode()).hexdigest()[:10]
    return f"urbanlens:{prefix}:{param_hash}"


def get_cached(key):
    """Get cached value from Redis."""
    try:
        val = redis_client.get(key)
        return json.loads(val) if val else None
    except Exception:
        return None


def set_cached(key, data, ttl=900):
    """Cache value in Redis with TTL (default 15 min)."""
    try:
        redis_client.set(key, json.dumps(data, default=str), ex=ttl)
    except Exception:
        pass


def invalidate_prefix(prefix):
    """Invalidate all keys with a prefix."""
    try:
        keys = redis_client.keys(f"urbanlens:{prefix}:*")
        if keys:
            redis_client.delete(*keys)
    except Exception:
        pass