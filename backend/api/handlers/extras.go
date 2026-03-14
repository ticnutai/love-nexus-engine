package handlers

import (
	"fmt"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
)

// Autocomplete handles GET /api/autocomplete?field=&prefix=&limit=
func (h *Handler) Autocomplete(c *fiber.Ctx) error {
	field := strings.TrimSpace(c.Query("field"))
	prefix := strings.TrimSpace(c.Query("prefix"))
	limit := c.QueryInt("limit", 10)

	if prefix == "" || len(prefix) < 2 {
		return c.Status(400).JSON(fiber.Map{"error": "Prefix must be at least 2 characters"})
	}
	if limit < 1 || limit > 50 {
		limit = 10
	}

	// Whitelist allowed columns
	column, ok := autocompleteFields[field]
	if !ok {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid field. Use: family, first, city, street"})
	}

	query := fmt.Sprintf(
		`SELECT DISTINCT %s FROM people WHERE %s ILIKE $1 ORDER BY %s LIMIT $2`,
		column, column, column,
	)

	rows, err := h.db.Query(c.Context(), query, prefix+"%", limit)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}
	defer rows.Close()

	suggestions, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (string, error) {
		var val string
		err := row.Scan(&val)
		return val, err
	})
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	return c.JSON(fiber.Map{"field": field, "prefix": prefix, "suggestions": suggestions})
}

// FamilyTree handles GET /api/family-tree/:tz
func (h *Handler) FamilyTree(c *fiber.Ctx) error {
	tz := c.Params("tz")
	if tz == "" || len(tz) > 9 {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid TZ"})
	}

	// Get the person
	row := h.db.QueryRow(c.Context(), personSQL, tz)
	person, err := scanPerson(row)
	if err != nil {
		if err == pgx.ErrNoRows {
			return c.Status(404).JSON(fiber.Map{"error": "Person not found"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	tree := fiber.Map{"person": person}

	// Find father
	if person.FatherTZ != nil && *person.FatherTZ != "" {
		fRow := h.db.QueryRow(c.Context(), personSQL, *person.FatherTZ)
		if father, err := scanPerson(fRow); err == nil {
			tree["father"] = father
		}
	}

	// Find mother
	if person.MotherTZ != nil && *person.MotherTZ != "" {
		mRow := h.db.QueryRow(c.Context(), personSQL, *person.MotherTZ)
		if mother, err := scanPerson(mRow); err == nil {
			tree["mother"] = mother
		}
	}

	// Find siblings (same father_tz or mother_tz)
	siblingSQL := `SELECT row_id, tz, family_name, first_name, city, street, phone, birth_year 
		FROM people WHERE tz != $1 AND (
			(father_tz = $2 AND father_tz IS NOT NULL AND father_tz != '')
			OR (mother_tz = $3 AND mother_tz IS NOT NULL AND mother_tz != '')
		) LIMIT 50`
	ftz := ""
	mtz := ""
	if person.FatherTZ != nil {
		ftz = *person.FatherTZ
	}
	if person.MotherTZ != nil {
		mtz = *person.MotherTZ
	}

	if ftz != "" || mtz != "" {
		sRows, err := h.db.Query(c.Context(), siblingSQL, tz, ftz, mtz)
		if err == nil {
			defer sRows.Close()
			siblings, _ := pgx.CollectRows(sRows, func(row pgx.CollectableRow) (SearchResult, error) {
				var r SearchResult
				err := row.Scan(&r.RowID, &r.TZ, &r.FamilyName, &r.FirstName, &r.City, &r.Street, &r.Phone, &r.BirthYear)
				return r, err
			})
			tree["siblings"] = siblings
		}
	}

	// Find children (people whose father_tz or mother_tz is this person's TZ)
	childrenSQL := `SELECT row_id, tz, family_name, first_name, city, street, phone, birth_year 
		FROM people WHERE father_tz = $1 OR mother_tz = $1 LIMIT 100`
	cRows, err := h.db.Query(c.Context(), childrenSQL, tz)
	if err == nil {
		defer cRows.Close()
		children, _ := pgx.CollectRows(cRows, func(row pgx.CollectableRow) (SearchResult, error) {
			var r SearchResult
			err := row.Scan(&r.RowID, &r.TZ, &r.FamilyName, &r.FirstName, &r.City, &r.Street, &r.Phone, &r.BirthYear)
			return r, err
		})
		tree["children"] = children
	}

	return c.JSON(tree)
}

// Stats handles GET /api/stats
func (h *Handler) Stats(c *fiber.Ctx) error {
	type StatsResponse struct {
		TotalPeople  int `json:"total_people"`
		UniqueCities int `json:"unique_cities"`
		UniqueFamily int `json:"unique_family_names"`
		WithPhone    int `json:"with_phone"`
	}

	var cached StatsResponse
	if h.cache.Get(c.Context(), cache.StatsKey, &cached) {
		return c.JSON(cached)
	}

	var stats StatsResponse
	h.db.QueryRow(c.Context(), "SELECT COUNT(*) FROM people").Scan(&stats.TotalPeople)
	h.db.QueryRow(c.Context(), "SELECT COUNT(DISTINCT city) FROM people WHERE city IS NOT NULL").Scan(&stats.UniqueCities)
	h.db.QueryRow(c.Context(), "SELECT COUNT(DISTINCT family_name) FROM people WHERE family_name IS NOT NULL").Scan(&stats.UniqueFamily)
	h.db.QueryRow(c.Context(), "SELECT COUNT(*) FROM people WHERE phone IS NOT NULL AND phone != ''").Scan(&stats.WithPhone)

	h.cache.Set(c.Context(), cache.StatsKey, stats, cache.StatsTTL)

	return c.JSON(stats)
}

// Allowed autocomplete fields → actual DB column names
var autocompleteFields = map[string]string{
	"family": "family_name",
	"first":  "first_name",
	"city":   "city",
	"street": "street",
}
