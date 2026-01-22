/**
 * Props for the AdminPanel component.
 */
export interface AdminPanelProps {
  /** Initial folder path to navigate to on mount */
  initialPath?: string;
  /** Called when user navigates - use for URL sync */
  onNavigate?: (path: string) => void;
  /** Optional class name for the root element */
  className?: string;
}
