import React from "react"

const RN = {
  View: "div",
  Text: "span",
  TextInput: "input",
  ScrollView: "div",
  FlatList: "div",
  Image: "img",
  ActivityIndicator: "div",
  KeyboardAvoidingView: "div",
  TouchableOpacity: "button",
  Modal: "dialog",
}

const flattenStyle = (style: unknown): Record<string, unknown> => {
  if (style == null) return {}
  if (Array.isArray(style)) return Object.assign({}, ...style.map((s) => flattenStyle(s)))
  if (typeof style === "object") return { ...(style as Record<string, unknown>) }
  return {}
}

const render = (Component: string, defaultProps: Record<string, unknown> = {}) => {
  const Comp = React.forwardRef<any, any>(({ children, style, testID, ...props }, ref) => {
    const mergedProps: Record<string, unknown> = { ...defaultProps, ...props, "data-testid": testID, ref }
    if (style) mergedProps.style = flattenStyle(style)
    if (children) return React.createElement(Component, mergedProps, children)
    return React.createElement(Component, mergedProps)
  })
  Comp.displayName = Component
  return Comp
}

const View = render("div")
const Text = render("span")
const TextInput = render("input")
const ScrollView = render("div")
const FlatList = React.forwardRef<any, any>(
  ({ data, renderItem, ListEmptyComponent, keyExtractor, style, ...props }, ref) => {
    const children =
      data && data.length > 0
        ? data.map((item: any, index: number) => {
            const key = keyExtractor?.(item, index) ?? index
            return React.createElement(React.Fragment, { key }, renderItem?.({ item, index, separators: {} }))
          })
        : ListEmptyComponent
          ? (ListEmptyComponent as any).type
            ? (ListEmptyComponent as React.ReactElement)
            : React.createElement(ListEmptyComponent as React.ComponentType, {})
          : null
    const mergedStyle = flattenStyle(style)
    return React.createElement("div", { ...props, ref, style: mergedStyle, "data-testid": undefined }, children)
  },
)
FlatList.displayName = "FlatList"
const Image = React.forwardRef<any, any>(({ source, ...props }, ref) => {
  return React.createElement("img", { ...props, src: source?.uri, ref })
})
Image.displayName = "Image"
const ActivityIndicator = render("div", { "aria-label": "Loading" })
const KeyboardAvoidingView = render("div")
const TouchableOpacity = React.forwardRef<any, any>(({ children, onPress, disabled, style, testID, ...props }, ref) => {
  return React.createElement(
    "button",
    {
      ...props,
      "data-testid": testID,
      onClick: disabled ? undefined : onPress,
      ref,
      style: style ? flattenStyle(style) : undefined,
    },
    children,
  )
})
TouchableOpacity.displayName = "TouchableOpacity"

const Modal = ({ children, visible, testID, ...props }: any) => {
  if (!visible) return null
  return React.createElement("dialog", { ...props, "data-testid": testID, open: true }, children)
}
Modal.displayName = "Modal"

const StyleSheet = {
  create: (styles: Record<string, unknown>) => styles,
  hairlineWidth: () => 0.5,
  flatten: (style: unknown) => {
    if (style == null) return {}
    if (Array.isArray(style)) return Object.assign({}, ...style)
    return style as Record<string, unknown>
  },
}

const Animated = {
  View: render("div"),
  Value: class {
    _value: number
    constructor(value: number) {
      this._value = value
    }
    setValue(val: number) {
      this._value = val
    }
    interpolate() {
      return { _value: this._value }
    }
  },
  timing: () => ({ start: (cb?: () => void) => cb?.() }),
  spring: () => ({ start: (cb?: () => void) => cb?.() }),
  sequence: () => ({ start: (cb?: () => void) => cb?.() }),
  parallel: () => ({ start: (cb?: () => void) => cb?.() }),
}

const Dimensions = { get: () => ({ width: 390, height: 844 }) }
const Platform = { OS: "ios", select: (obj: Record<string, unknown>) => obj.ios ?? obj.default }
const useColorScheme = () => "dark"
const Alert = { alert: () => {} }
const Linking = { openURL: () => Promise.resolve() }
const RefreshControl = (props: Record<string, unknown>) => React.createElement("div", props)

const exports = {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Modal,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Animated,
  StyleSheet,
  Dimensions,
  Platform,
  useColorScheme,
  Alert,
  Linking,
  RefreshControl,
}
export default exports
export {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Modal,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Animated,
  StyleSheet,
  Dimensions,
  Platform,
  useColorScheme,
  Alert,
  Linking,
  RefreshControl,
}
