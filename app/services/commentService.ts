import { eq, and } from "drizzle-orm";
import { db } from "~/db";
import { courseComments, users, courses, CommentModerationStatus } from "~/db/schema";

export type CommentWithUser = {
  id: number;
  courseId: number;
  userId: number;
  body: string;
  status: CommentModerationStatus;
  createdAt: string;
  moderatedAt: string | null;
  userName: string;
  userAvatarUrl: string | null;
};

export function getApprovedCommentsForCourse(courseId: number): CommentWithUser[] {
  return db
    .select({
      id: courseComments.id,
      courseId: courseComments.courseId,
      userId: courseComments.userId,
      body: courseComments.body,
      status: courseComments.status,
      createdAt: courseComments.createdAt,
      moderatedAt: courseComments.moderatedAt,
      userName: users.name,
      userAvatarUrl: users.avatarUrl,
    })
    .from(courseComments)
    .innerJoin(users, eq(courseComments.userId, users.id))
    .where(
      and(
        eq(courseComments.courseId, courseId),
        eq(courseComments.status, CommentModerationStatus.Approved)
      )
    )
    .orderBy(courseComments.moderatedAt)
    .all();
}

export function getPendingCommentsForCourse(courseId: number): CommentWithUser[] {
  return db
    .select({
      id: courseComments.id,
      courseId: courseComments.courseId,
      userId: courseComments.userId,
      body: courseComments.body,
      status: courseComments.status,
      createdAt: courseComments.createdAt,
      moderatedAt: courseComments.moderatedAt,
      userName: users.name,
      userAvatarUrl: users.avatarUrl,
    })
    .from(courseComments)
    .innerJoin(users, eq(courseComments.userId, users.id))
    .where(
      and(
        eq(courseComments.courseId, courseId),
        eq(courseComments.status, CommentModerationStatus.Pending)
      )
    )
    .orderBy(courseComments.createdAt)
    .all();
}

export function getUserPendingCommentsForCourse(userId: number, courseId: number) {
  return db
    .select()
    .from(courseComments)
    .where(
      and(
        eq(courseComments.userId, userId),
        eq(courseComments.courseId, courseId),
        eq(courseComments.status, CommentModerationStatus.Pending)
      )
    )
    .orderBy(courseComments.createdAt)
    .all();
}

export function submitComment(userId: number, courseId: number, body: string) {
  db.insert(courseComments)
    .values({ userId, courseId, body })
    .run();
}

export function deleteComment(commentId: number, requestingUserId: number) {
  const comment = db
    .select()
    .from(courseComments)
    .where(eq(courseComments.id, commentId))
    .get();

  if (!comment || comment.userId !== requestingUserId) {
    throw new Error("Comment not found.");
  }

  if (comment.status !== CommentModerationStatus.Pending) {
    throw new Error("Only pending comments can be deleted.");
  }

  db.delete(courseComments).where(eq(courseComments.id, commentId)).run();
}

export function moderateComment(
  commentId: number,
  instructorId: number,
  decision: "approve" | "reject"
) {
  const comment = db
    .select({ comment: courseComments, instructorId: courses.instructorId })
    .from(courseComments)
    .innerJoin(courses, eq(courseComments.courseId, courses.id))
    .where(eq(courseComments.id, commentId))
    .get();

  if (!comment) {
    throw new Error("Comment not found.");
  }

  if (comment.instructorId !== instructorId) {
    throw new Error("You can only moderate comments on your own courses.");
  }

  db.update(courseComments)
    .set({
      status:
        decision === "approve"
          ? CommentModerationStatus.Approved
          : CommentModerationStatus.Rejected,
      moderatedAt: new Date().toISOString(),
    })
    .where(eq(courseComments.id, commentId))
    .run();
}
