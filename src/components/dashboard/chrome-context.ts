"use client";

import * as React from "react";

export interface ChromeCtx {
  collapsed: boolean;
  setCollapsed: (b: boolean) => void;
  toggle: () => void;
}

export const ChromeContext = React.createContext<ChromeCtx>({
  collapsed: false,
  setCollapsed: () => {},
  toggle: () => {},
});

export const useChrome = () => React.useContext(ChromeContext);
