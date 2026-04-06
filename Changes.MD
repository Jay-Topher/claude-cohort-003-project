# Changes

---

## Course Comments with Instructor Moderation

**Summary:** Students can leave text comments on courses they are enrolled in. Comments start as "pending" and are only visible to the submitting student until an instructor approves them. Instructors moderate comments from a new tab in the course editor. Approved comments are displayed publicly on the course detail page.

### New Files

- **`app/services/commentService.ts`**
  - `getApprovedCommentsForCourse(courseId)` — returns all approved comments for a course, joined with user data, ordered by moderation date
  - `getPendingCommentsForCourse(courseId)` — returns pending comments for instructor review, ordered by submission date (FIFO)
  - `getUserPendingCommentsForCourse(userId, courseId)` — returns all of a student's own pending comments for a course
  - `submitComment(userId, courseId, body)` — inserts a new pending comment
  - `deleteComment(commentId, requestingUserId)` — deletes a pending comment; verifies ownership and that the comment has not been approved
  - `moderateComment(commentId, instructorId, decision)` — approves or rejects a comment after verifying the instructor owns the course

- **`drizzle/0004_course_comments.sql`** — migration that creates the `course_comments` table
- **`drizzle/0005_drop_comment_unique_index.sql`** — migration that drops the unique index on `(user_id, course_id)` to allow multiple comments per student per course

### Modified Files

- **`app/db/schema.ts`**
  - Added `CommentModerationStatus` enum with values `pending`, `approved`, `rejected`
  - Added `courseComments` table with columns: `id`, `userId` (FK → users), `courseId` (FK → courses), `body`, `status` (default `pending`), `moderatedAt`, `createdAt`
  - No unique constraint on `(userId, courseId)` — students can submit multiple comments per course

- **`app/routes/courses.$slug.tsx`** (course detail page)
  - Updated the action to support multiple intents (`submit-comment`, `delete-comment`, and the existing rating fallback)
  - Added `getApprovedCommentsForCourse` and `getUserPendingCommentsForCourse` calls to the loader
  - Added a `CourseComments` component rendered below the two-column layout:
    - The comment submission form is always visible to enrolled students
    - A student's own pending comments are shown above the form with "Pending review" badges and individual delete buttons — not visible to other users
    - Approved comments are listed publicly with the student's name and moderation date

- **`app/routes/instructor.$courseId.tsx`** (course editor)
  - Added `approve-comment` and `reject-comment` intents to the action schema
  - Extended the action to handle both intents via `moderateComment`
  - Added a "Comments" tab to the course editor with a pending-count badge
  - The tab renders a `CommentModerationCard` per pending comment, with Approve and Reject buttons that use `useFetcher` for non-navigating mutations

---

## Course Star Ratings

**Summary:** Students can rate courses with a 1–5 star rating. Average ratings are displayed on the course list page and the course detail page. Enrolled users can submit or update their rating from the course detail sidebar.

### New Files

- **`app/services/ratingService.ts`**
  - `getCourseAverageRating(courseId)` — queries average rating and total count for a course; returns `{ average: number | null, count: number }`
  - `getUserRatingForCourse(userId, courseId)` — returns the current user's rating row for a course, if one exists
  - `upsertCourseRating(userId, courseId, rating)` — inserts a new rating or updates the existing one for the user/course pair

- **`drizzle/0003_unique_agent_brand.sql`** — generated migration that creates the `course_ratings` table and its unique index

### Modified Files

- **`app/db/schema.ts`**
  - Added `uniqueIndex` to imports from `drizzle-orm/sqlite-core`
  - Added `courseRatings` table with columns: `id`, `userId` (FK → users), `courseId` (FK → courses), `rating` (integer 1–5), `createdAt`
  - Added a unique index `course_ratings_user_course_unique` on `(userId, courseId)` to enforce one rating per user per course

- **`app/routes/courses.tsx`** (course list page)
  - Imported `Star` from `lucide-react` and `getCourseAverageRating` from `ratingService`
  - Added a `StarRating` display component (read-only filled stars)
  - In the loader, calls `getCourseAverageRating` per course and attaches `averageRating` and `ratingCount` to each course object
  - Updated the course card footer to show the star rating row (hidden when no ratings exist yet)

- **`app/routes/courses.$slug.tsx`** (course detail page)
  - Imported `Form` from `react-router`, `Star` from `lucide-react`, and `getCourseAverageRating`, `getUserRatingForCourse`, `upsertCourseRating` from `ratingService`
  - Added an `action` handler that validates the user is enrolled, reads the `rating` field from form data (must be 1–5), and calls `upsertCourseRating`
  - In the loader, fetches `averageRating`, `ratingCount`, and `userRating` (the current user's rating, only populated if enrolled) and includes them in loader data
  - Hero section: displays average rating with filled stars, numeric score, and rating count below the course description (hidden when no ratings exist)
  - Sidebar: displays an interactive 5-star widget for enrolled users using a `<Form method="post">` with one submit button per star; the user's current rating is highlighted in yellow; clicking any star submits immediately
