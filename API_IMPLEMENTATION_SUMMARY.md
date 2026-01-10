# Question Retrieval & Test Management - API Implementation

## Endpoint Overview
**GET** `/api/test/:id/questions`

Fetches all questions for a specific test with comprehensive metadata and validation.

---

## Implementation Details

### Route Definition
**File:** [server/routes/contestRoutes.js](server/routes/contestRoutes.js)
```javascript
router.get("/:id/questions", getTestQuestions);
```

### Controller Function
**File:** [server/controllers/contestCon.js](server/controllers/contestCon.js)

#### Function: `getTestQuestions(req, res)`

---

## Features Implemented

### 1. Test Validation
- ✅ **Test ID Validation**: Checks if test ID is provided and properly formatted
- ✅ **Test Existence Check**: Returns 404 if test not found
- ✅ **Test Status Validation**: Prevents access if test is completed
- ✅ **Time Window Validation**: Checks if test is within active time range
  - Returns 403 if test has ended
  - Provides `testStarted` flag indicating if test has begun

### 2. Question Data Retrieval
Fetches questions from database and returns comprehensive metadata:
- **Basic Info**: `id`, `title`, `description`, `difficulty`, `marks`
- **Question Type**: Distinguishes between coding and MCQ questions
- **Constraints & Format**:
  - `constraints` - Problem constraints
  - `inputFormat` - Input specification
  - `outputFormat` - Output specification
- **Code Boilerplate**: `boilerplateCode` for supported languages (cpp, c, java, python, javascript)
- **Coding Specifics**:
  - `functionName` - Function signature
  - `inputVariables` - Parameter types and names
  - `sampleTestCase` - First test case for reference
  - `totalTestCases` - Number of available test cases
- **MCQ Specifics**: `options` array for multiple-choice questions
- **Numbering**: Sequential `number` field for UI display

### 3. Security
- ✅ **Answer Protection**: Excludes full `testcases` and `correctAnswer` from response
- ✅ **Sample Test Cases Only**: Returns only the first test case as sample to prevent cheating
- ✅ **Public Access**: Endpoint is public (unauthenticated) but test status controls visibility

### 4. Error Handling
Comprehensive error responses with appropriate HTTP status codes:

| Status | Error Scenario | Message |
|--------|---|---|
| 400 | Invalid/empty test ID | "Invalid test ID provided" |
| 404 | Test not found | "Test not found" |
| 403 | Test completed | "This test has been completed..." |
| 403 | Test ended | "This test has ended" |
| 500 | Server error | Error message with details |

### 5. Response Format

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "testId": "contest-id-string",
    "testTitle": "Test Name",
    "testDescription": "Description",
    "testStatus": "ongoing",
    "testStartTime": "2026-01-10T10:00:00.000Z",
    "testEndTime": "2026-01-10T12:00:00.000Z",
    "testStarted": true,
    "totalQuestions": 5,
    "timeRemaining": 3600,
    "questions": [
      {
        "id": "question-id",
        "number": 1,
        "title": "Question Title",
        "description": "Full problem description",
        "difficulty": "Medium",
        "marks": 100,
        "type": "Coding",
        "questionType": "Coding",
        "constraints": "1 <= n <= 10^5",
        "inputFormat": "First line contains n",
        "outputFormat": "Output the result",
        "boilerplateCode": {
          "cpp": "int solve() { ... }",
          "python": "def solve(): ...",
          ...
        },
        "functionName": "solve",
        "inputVariables": [
          { "name": "n", "type": "int" },
          { "name": "arr", "type": "int_array" }
        ],
        "sampleTestCase": {
          "input": { "n": 5, "arr": [1,2,3,4,5] },
          "output": "15"
        },
        "totalTestCases": 10,
        "options": [],
        "timeRemaining": 3600
      }
    ]
  }
}
```

**Error Response Examples:**

```json
{
  "success": false,
  "error": "Invalid test ID provided"
}
```

```json
{
  "success": false,
  "error": "Test not found"
}
```

---

## Usage Examples

### Fetch questions for a test
```bash
curl -X GET "http://localhost:8080/api/test/507f1f77bcf86cd799439011/questions"
```

### Response includes:
- All questions with full metadata
- Time remaining for the test
- Test status information
- Sample test cases (not full test suite)
- Boilerplate code for multiple languages

---

## Database Models Used

1. **Contest Model** - Stores test information with:
   - `questions` array (stores question IDs)
   - `status` (waiting, ongoing, completed)
   - `startTime` and `endTime`
   - `title` and `description`

2. **Question Model** - Stores question details with:
   - Basic info (title, description, difficulty, marks)
   - Coding-specific fields (constraints, testcases, boilerplate)
   - MCQ-specific fields (options, correctAnswer)
   - Test cases array

---

## Notes

- **Time Tracking**: `timeRemaining` is calculated client-side in seconds for each request
- **Question Ordering**: Questions appear in the order they're stored in the Contest
- **Sample Test Cases**: Only the first test case is included in the response
- **Boilerplate Code**: All supported language templates are returned if available
- **Security**: Answer test cases and correct answers are never exposed to clients

