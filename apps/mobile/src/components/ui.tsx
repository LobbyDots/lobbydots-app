import type { ComponentProps, ReactNode } from "react";
import { Pressable, Text, TextInput, View, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fonts, radius, spacing, type } from "@/theme/tokens";

export function Screen({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }}>
      <View
        style={[{ flex: 1, padding: spacing(7), justifyContent: "center" }, style]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}

export function Display({ children }: { children: ReactNode }) {
  return (
    <Text
      style={{
        fontFamily: fonts.serif,
        fontSize: type.display,
        color: colors.ink,
        lineHeight: type.display * 1.1,
      }}
    >
      {children}
    </Text>
  );
}

export function Title({ children }: { children: ReactNode }) {
  return (
    <Text
      style={{
        fontFamily: fonts.serif,
        fontSize: type.title,
        color: colors.ink,
        lineHeight: type.title * 1.2,
      }}
    >
      {children}
    </Text>
  );
}

export function Body({
  children,
  dim,
}: {
  children: ReactNode;
  dim?: boolean;
}) {
  return (
    <Text
      style={{
        fontFamily: fonts.sans,
        fontSize: type.body,
        color: dim ? colors.muted : colors.charcoal,
        lineHeight: type.body * 1.5,
      }}
    >
      {children}
    </Text>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        backgroundColor: disabled ? colors.muted : colors.ink,
        paddingVertical: spacing(4),
        paddingHorizontal: spacing(6),
        borderRadius: radius.md,
        alignItems: "center",
      }}
    >
      <Text
        style={{
          fontFamily: fonts.sansMedium,
          color: colors.cream,
          fontSize: type.body,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function TextField(props: ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      placeholderTextColor={colors.muted}
      {...props}
      style={[
        {
          fontFamily: fonts.sans,
          borderBottomWidth: 1,
          borderColor: colors.hairline,
          paddingVertical: spacing(3),
          fontSize: type.body,
          color: colors.ink,
        },
        props.style,
      ]}
    />
  );
}
