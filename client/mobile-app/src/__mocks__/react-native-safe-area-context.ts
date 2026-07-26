import React from "react"

export const SafeAreaProvider = ({ children }: { children?: React.ReactNode }) =>
  React.createElement("div", { className: "safe-area-provider" }, children)

export const SafeAreaView = ({ children, style }: { children?: React.ReactNode; style?: any }) =>
  React.createElement("div", { className: "safe-area-view", style }, children)

export const useSafeAreaInsets = () => ({ top: 0, bottom: 0, left: 0, right: 0 })
