import { redirect } from "next/navigation";

// Business and customer sign-in are now the same page (it auto-detects which
// one you are after you log in) — this old URL just forwards there so any
// existing bookmarks/links keep working.
export default function BusinessLoginRedirect() {
  redirect("/account/login");
}
