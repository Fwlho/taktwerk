/** Wohin führt eine Benachrichtigung? Freigabe-Anfragen öffnen direkt die Freigabe-Ansicht. */
export function notificationLink(slug: string, type: string, postId?: string): string {
  if (!slug) return "/start";
  if (type === "approval_requested") return postId ? `/o/${slug}/approvals/review?start=${postId}` : `/o/${slug}/approvals`;
  return postId ? `/o/${slug}/posts/${postId}` : `/o/${slug}`;
}

export const NOTIFICATION_TYPES = ["approval_requested", "post_approved", "changes_requested", "comment_added", "post_assigned"] as const;
