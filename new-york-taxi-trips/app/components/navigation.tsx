import { Content } from "./content";
import { Toggle } from "./toggle";

export const Navigation: React.FC<React.PropsWithChildren> = ({ children }) => {
  return <nav>{children}</nav>;
};
