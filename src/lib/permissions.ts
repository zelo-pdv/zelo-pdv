import type {
  ActionKey,
  ModuleKey,
  Permissions,
} from "@/store/useSettingsStore";

export function hasPermission(
  permissions: Permissions | null | undefined,
  module: ModuleKey,
  action: ActionKey,
  isAdmin?: boolean,
): boolean {
  if (isAdmin) return true;
  return permissions?.[module]?.includes(action) ?? false;
}
