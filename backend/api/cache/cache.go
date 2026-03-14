package cache

import (
	"context"
	"encoding/json"
	"time"

	"github.com/redis/go-redis/v9"
)

// Cache wraps Dragonfly/Redis for transparent caching.
// If rdb is nil, all operations are no-ops (graceful degradation).
type Cache struct {
	rdb *redis.Client
}

func New(rdb *redis.Client) *Cache {
	return &Cache{rdb: rdb}
}

func (c *Cache) Available() bool {
	return c.rdb != nil
}

// Get retrieves a cached JSON value and unmarshals it into dest.
// Returns false if not found or cache unavailable.
func (c *Cache) Get(ctx context.Context, key string, dest interface{}) bool {
	if c.rdb == nil {
		return false
	}
	val, err := c.rdb.Get(ctx, key).Result()
	if err != nil {
		return false
	}
	return json.Unmarshal([]byte(val), dest) == nil
}

// Set stores a value as JSON with TTL.
func (c *Cache) Set(ctx context.Context, key string, value interface{}, ttl time.Duration) {
	if c.rdb == nil {
		return
	}
	data, err := json.Marshal(value)
	if err != nil {
		return
	}
	c.rdb.Set(ctx, key, data, ttl)
}

// Delete removes a cached entry.
func (c *Cache) Delete(ctx context.Context, key string) {
	if c.rdb == nil {
		return
	}
	c.rdb.Del(ctx, key)
}

// PersonKey generates cache key for a person lookup.
func PersonKey(tz string) string {
	return "person:" + tz
}

// SearchKey generates cache key for search queries.
func SearchKey(hash string) string {
	return "search:" + hash
}

// StatsKey is the key for cached aggregate stats.
const StatsKey = "stats:global"

// TTLs
const (
	PersonTTL = 24 * time.Hour
	SearchTTL = 1 * time.Hour
	StatsTTL  = 6 * time.Hour
)
