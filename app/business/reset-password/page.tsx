import { redirect } from "next/navigation";

// Business and customer password resets now share one flow. Old reset emails
// already sent point here with a recovery token in the URL fragment — a
// redirect's Location header carries no fragment of its own, so the browser
// keeps the original one, and /account/reset-password picks the token up
// exactly the same way this page used to.
export default function BusinessResetPasswordRedirect() {
  redirect("/account/reset-password");
}
