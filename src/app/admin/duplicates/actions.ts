"use server";

// إجراء حذف موضوع مكرر من صفحة مقارنة المواضيع
import { revalidatePath } from "next/cache";
import { deleteTopicAction } from "../topics/actions";

export async function deleteDuplicateTopicAction(id: string) {
  await deleteTopicAction(id);
  revalidatePath("/admin/duplicates");
}
