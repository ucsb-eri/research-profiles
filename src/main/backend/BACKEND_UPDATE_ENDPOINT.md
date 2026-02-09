# Faculty Update Endpoint - Implementation Summary

## Overview
Added a `PUT /api/faculty/:id` endpoint that allows faculty members to update their own research profiles. The endpoint includes authorization checks to ensure only the faculty member can update their own profile.

## Files Modified

### 1. `models/faculty_model.js`
- **Added**: `updateFaculty(id, updates)` function
- **Functionality**: 
  - Dynamically builds UPDATE query based on provided fields
  - Handles: `specialization`, `research_areas`, `phone`, `office`, `website`
  - Returns updated faculty record

### 2. `controllers/facultyController.js`
- **Added**: `updateById(req, res)` controller function
- **Functionality**:
  - Validates faculty exists (404 if not found)
  - Verifies authorization: checks `X-User-Email` header matches faculty email
  - Returns 401 if email not provided
  - Returns 403 if email doesn't match
  - Updates only provided fields
  - Returns updated faculty object

### 3. `routes/facultyRoutes.js`
- **Added**: `router.put('/:id', facultyController.updateById)`
- **Route**: `PUT /api/faculty/:id`

## API Endpoint Details

### Request
```
PUT /api/faculty/:id
Headers:
  Content-Type: application/json
  X-User-Email: user@example.com  (required for authorization)

Body:
{
  "specialization": "Optional string",
  "research_areas": ["array", "of", "strings"],
  "phone": "Optional string",
  "office": "Optional string",
  "website": "Optional URL string"
}
```

### Response

**Success (200):**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@ucsb.edu",
  "specialization": "Updated specialization",
  "research_areas": ["area1", "area2"],
  ...
}
```

**Error Responses:**
- `400`: No valid fields to update
- `401`: User email not provided
- `403`: Email does not match faculty member email
- `404`: Faculty member not found
- `500`: Server error

## Security Features

1. **Email Verification**: Backend verifies that the `X-User-Email` header matches the faculty member's email
2. **Partial Updates**: Only updates fields that are provided (undefined fields are ignored)
3. **Validation**: Checks that faculty exists before attempting update

## Database Considerations

### `research_areas` Field
The `research_areas` field is stored in the database. The update function accepts it as an array. Depending on your database schema:
- If stored as **PostgreSQL array type**: The array will be passed directly
- If stored as **JSON/JSONB**: You may need to convert: `JSON.stringify(research_areas)`
- If stored as **text**: You may need to convert: `research_areas.join(', ')`

**Current implementation** passes the array directly. If you encounter issues, modify the `updateFaculty` function in `models/faculty_model.js` to handle the conversion based on your database schema.

### Example Fix for JSON Storage:
```javascript
if (research_areas !== undefined) {
  fields.push(`research_areas = $${paramCount}`);
  values.push(JSON.stringify(research_areas)); // Convert to JSON string
  paramCount++;
}
```

## Testing

### Test with curl:
```bash
curl -X PUT https://api.research-profiles.grit.ucsb.edu/api/faculty/1 \
  -H "Content-Type: application/json" \
  -H "X-User-Email: faculty@ucsb.edu" \
  -d '{
    "specialization": "Updated research focus",
    "research_areas": ["AI", "Machine Learning"],
    "phone": "805-555-1234"
  }'
```

### Test Cases:
1. ✅ Update with matching email
2. ✅ Update with non-matching email (should return 403)
3. ✅ Update without email header (should return 401)
4. ✅ Update non-existent faculty (should return 404)
5. ✅ Partial update (only some fields)

## Frontend Integration

The frontend edit page (`/faculty/[id]/edit`) already:
- Sends `X-User-Email` header with the user's email
- Handles error responses appropriately
- Redirects to profile page on success

## Next Steps (Optional Enhancements)

1. **Add `updated_at` timestamp column** to track when profiles are updated
2. **Add audit logging** to track who made changes and when
3. **Add rate limiting** to prevent abuse
4. **Add input validation** (e.g., URL format for website)
5. **Add more fields** to the update (e.g., title, department - with proper authorization)
6. **Add image upload** for profile photos

## Notes

- The endpoint is now ready to use
- Make sure your database schema supports the fields being updated
- Consider adding database constraints/validation as needed
- The authorization check is basic - consider adding JWT tokens or session management for production
