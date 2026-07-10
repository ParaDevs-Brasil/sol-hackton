import { useEffect, useState } from "react";
import Game from "./Game";
import Landing from "./Landing";
import Leagues from "./Leagues";
import Profile from "./Profile";

export default function App() {
  const [route, setRoute] = useState(window.location.hash);

  useEffect(() => {
    const onHashChange = () => setRoute(window.location.hash);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  if (route === "#/jogar") return <Game />;
  if (route === "#/ligas") return <Leagues />;
  if (route === "#/perfil") return <Profile />;
  return <Landing />;
}
