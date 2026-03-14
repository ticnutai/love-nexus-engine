package handlers

import (
	"crypto/sha256"
	"fmt"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"

	"zahauton-api/cache"
)

// SearchResult is a single search result row
type SearchResult struct {
	RowID      int     `json:"row_id"`
	TZ         string  `json:"tz"`
	FamilyName *string `json:"family_name"`
	FirstName  *string `json:"first_name"`
	City       *string `json:"city"`
	Street     *string `json:"street"`
	Phone      *string `json:"phone"`
	BirthYear  *string `json:"birth_year"`
}

// SearchResponse wraps search results with pagination
type SearchResponse struct {
	Results    []SearchResult `json:"results"`
	Total      int            `json:"total"`
	Page       int            `json:"page"`
	PerPage    int            `json:"per_page"`
	HasMore    bool           `json:"has_more"`
}

// Search handles GET /api/search?family=&first=&city=&phone=&tz=&page=&per_page=
func (h *Handler) Search(c *fiber.Ctx) error {
	family := strings.TrimSpace(c.Query("family"))
	first := strings.TrimSpace(c.Query("first"))
	city := strings.TrimSpace(c.Query("city"))
	phone := strings.TrimSpace(c.Query("phone"))
	tz := strings.TrimSpace(c.Query("tz"))
	page := c.QueryInt("page", 1)
	perPage := c.QueryInt("per_page", 50)

	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 200 {
		perPage = 50
	}

	// At least one filter required
	if family == "" && first == "" && city == "" && phone == "" && tz == "" {
		return c.Status(400).JSON(fiber.Map{"error": "At least one search parameter required"})
	}

	// Cache check
	cacheKey := cache.SearchKey(hashQuery(family, first, city, phone, tz, page, perPage))
	var cached SearchResponse
	if h.cache.Get(c.Context(), cacheKey, &cached) {
		return c.JSON(cached)
	}

	// Build dynamic query
	var conditions []string
	var args []interface{}
	argIdx := 1

	if tz != "" {
		conditions = append(conditions, fmt.Sprintf("tz = $%d", argIdx))
		args = append(args, tz)
		argIdx++
	}
	if family != "" {
		conditions = append(conditions, fmt.Sprintf("family_name ILIKE $%d", argIdx))
		args = append(args, family+"%")
		argIdx++
	}
	if first != "" {
		conditions = append(conditions, fmt.Sprintf("first_name ILIKE $%d", argIdx))
		args = append(args, first+"%")
		argIdx++
	}
	if city != "" {
		conditions = append(conditions, fmt.Sprintf("city ILIKE $%d", argIdx))
		args = append(args, city+"%")
		argIdx++
	}
	if phone != "" {
		conditions = append(conditions, fmt.Sprintf("phone = $%d", argIdx))
		args = append(args, phone)
		argIdx++
	}

	where := strings.Join(conditions, " AND ")
	offset := (page - 1) * perPage

	// Count query
	countSQL := "SELECT COUNT(*) FROM people WHERE " + where
	var total int
	err := h.db.QueryRow(c.Context(), countSQL, args...).Scan(&total)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	// Data query
	dataSQL := fmt.Sprintf(
		"SELECT row_id, tz, family_name, first_name, city, street, phone, birth_year FROM people WHERE %s ORDER BY family_name, first_name LIMIT $%d OFFSET $%d",
		where, argIdx, argIdx+1,
	)
	args = append(args, perPage, offset)

	rows, err := h.db.Query(c.Context(), dataSQL, args...)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}
	defer rows.Close()

	results, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (SearchResult, error) {
		var r SearchResult
		err := row.Scan(&r.RowID, &r.TZ, &r.FamilyName, &r.FirstName, &r.City, &r.Street, &r.Phone, &r.BirthYear)
		return r, err
	})
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	resp := SearchResponse{
		Results: results,
		Total:   total,
		Page:    page,
		PerPage: perPage,
		HasMore: offset+perPage < total,
	}

	h.cache.Set(c.Context(), cacheKey, resp, cache.SearchTTL)

	return c.JSON(resp)
}

func hashQuery(parts ...interface{}) string {
	h := sha256.New()
	for _, p := range parts {
		fmt.Fprintf(h, "%v|", p)
	}
	return fmt.Sprintf("%x", h.Sum(nil))[:16]
}
