import type React from "react";

type Props = {
  children: React.ReactNode;
};
const Layout: React.FC<Props> = ({ children }) => {
  return <div className="p-0 m-0">{children}</div>;
};
export default Layout;
