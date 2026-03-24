"use client";

import { useQuery } from "convex/react";
import { api } from "./convex-api";
import { Id } from "../../../convex/_generated/dataModel";

export function useCurrentUser() {
  const user = useQuery(api.currentUser.get);
  return user;
}

export function useRequiredUserId(): Id<"users"> | undefined {
  const user = useCurrentUser();
  return user?._id;
}
