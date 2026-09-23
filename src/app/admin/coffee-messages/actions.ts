"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import {
  deleteCoffeeMessage,
  markCoffeeMessageRead,
} from "@/lib/coffee/messages"

async function requireAdmin() {
  const session = await auth()
  const user = session?.user
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    throw new Error("هذا الإجراء متاح للمديرين فقط")
  }
}

export async function markCoffeeMessageReadAction(id: string) {
  await requireAdmin()
  await markCoffeeMessageRead(id)
  revalidatePath("/admin/coffee-messages")
}

export async function deleteCoffeeMessageAction(id: string) {
  await requireAdmin()
  await deleteCoffeeMessage(id)
  revalidatePath("/admin/coffee-messages")
}
