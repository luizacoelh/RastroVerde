import { redirect } from "next/navigation";

// O proxy manda visitantes sem sessão para /login.
export default function Home() {
  redirect("/propriedades");
}
