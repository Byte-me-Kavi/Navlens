/**
 * HeatmapSettings Component
 *
 * Sidebar panel for controlling heatmap visualization options
 */

"use client";

// Icon components
const ChevronLeftIcon = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 19l-7-7 7-7"
    />
  </svg>
);

const MonitorIcon = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
    />
  </svg>
);

const TabletIcon = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
    />
  </svg>
);

const MobileIcon = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
    />
  </svg>
);

const ClickIcon = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
    />
  </svg>
);

const FileIcon = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
    />
  </svg>
);

const EyeIcon = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
    />
  </svg>
);

const EyeOffIcon = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
    />
  </svg>
);

const HeatmapIcon = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
    />
  </svg>
);

const SettingsIcon = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

export interface HeatmapSettingsProps {
  // Page settings
  availablePages: string[];
  selectedPage: string;
  onPageChange: (page: string) => void;

  // Device settings
  selectedDevice: "desktop" | "tablet" | "mobile";
  onDeviceChange: (device: "desktop" | "tablet" | "mobile") => void;
  userDevice?: "desktop" | "tablet" | "mobile";

  // Data type settings
  selectedDataType: "clicks" | "scrolls" | "hover" | "cursor-paths";
  onDataTypeChange: (dataType: "clicks" | "scrolls" | "hover" | "cursor-paths") => void;

  // Visibility toggles
  showElements: boolean;
  onShowElementsChange: (show: boolean) => void;

  showHeatmap: boolean;
  onShowHeatmapChange: (show: boolean) => void;

  // Viewport filter
  showAllViewports: boolean;
  onShowAllViewportsChange: (showAll: boolean) => void;

  // Optional site info
  siteId?: string;

  // Sidebar state
  isOpen?: boolean;
  onOpenChange?: () => void;
  onClose?: () => void;
}

export function HeatmapSettings({
  availablePages,
  selectedPage,
  onPageChange,
  selectedDevice,
  onDeviceChange,
  selectedDataType,
  onDataTypeChange,
  showElements,
  onShowElementsChange,
  showHeatmap,
  onShowHeatmapChange,
  showAllViewports,
  onShowAllViewportsChange,
  siteId,
  isOpen = true,
  onOpenChange,
  onClose,
  userDevice = "desktop",
}: HeatmapSettingsProps) {
  const sidebarOpen = isOpen;
  const handleOpen = onOpenChange || (() => {});
  const handleClose = onClose || (() => {});

  return (
    <>
      {/* Collapsible Sidebar - Responsive Overlay */}
      <div
        className={`fixed left-0 top-0 z-100 transition-all duration-300 ease-in-out bg-white/95 backdrop-blur-md shadow-2xl overflow-hidden flex flex-col border-r border-gray-200 ${
          sidebarOpen ? "w-full sm:w-96" : "w-0"
        } h-screen max-w-full sm:max-w-md rounded-r-xl`}
      >
        <div className="p-5 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-bold text-gray-900">
              Heatmap Settings
            </h2>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <ChevronLeftIcon />
            </button>
          </div>
          {siteId && (
            <p className="text-xs text-gray-500">
              Site: {siteId.slice(0, 8)}...
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
          {/* Page Selection */}
          <div>
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 mb-2">
              <FileIcon />
              Page Path
            </label>
            <select
              value={selectedPage}
              onChange={(e) => onPageChange(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm transition-all"
            >
              {availablePages.map((page) => (
                <option key={page} value={page}>
                  {page}
                </option>
              ))}
            </select>
          </div>

          {/* Device Type - Hidden on mobile devices */}
          {userDevice !== "mobile" && (
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-2 block">
                Device Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => onDeviceChange("desktop")}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                    selectedDevice === "desktop"
                      ? "border-blue-600 bg-blue-50 text-blue-600"
                      : "border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:bg-gray-50"
                  }`}
                >
                  <MonitorIcon />
                  <span className="text-xs mt-1.5 font-medium">Desktop</span>
                </button>
                <button
                  onClick={() => onDeviceChange("tablet")}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                    selectedDevice === "tablet"
                      ? "border-blue-600 bg-blue-50 text-blue-600"
                      : "border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:bg-gray-50"
                  }`}
                >
                  <TabletIcon />
                  <span className="text-xs mt-1.5 font-medium">Tablet</span>
                </button>
                <button
                  onClick={() => onDeviceChange("mobile")}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                    selectedDevice === "mobile"
                      ? "border-blue-600 bg-blue-50 text-blue-600"
                      : "border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:bg-gray-50"
                  }`}
                >
                  <MobileIcon />
                  <span className="text-xs mt-1.5 font-medium">Mobile</span>
                </button>
              </div>
            </div>
          )}

          {/* Data Type */}
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-2 block">
              Data Type
            </label>
            <div className="space-y-2">
              <button
                onClick={() => onDataTypeChange("clicks")}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                  selectedDataType === "clicks"
                    ? "border-blue-600 bg-blue-50 text-blue-600"
                    : "border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:bg-gray-50"
                }`}
              >
                <ClickIcon />
                <div className="text-left">
                  <div className="font-semibold text-sm">Click Heatmap</div>
                  <div className="text-xs opacity-75">
                    View user click patterns
                  </div>
                </div>
              </button>
              <button
                onClick={() => onDataTypeChange("scrolls")}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                  selectedDataType === "scrolls"
                    ? "border-purple-600 bg-purple-50 text-purple-600"
                    : "border-gray-200 bg-white text-gray-600 hover:border-purple-300 hover:bg-gray-50"
                }`}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
                <div className="text-left">
                  <div className="font-semibold text-sm">Scroll Heatmap</div>
                  <div className="text-xs opacity-75">
                    See how deep users scroll
                  </div>
                </div>
              </button>
              <button
                onClick={() => onDataTypeChange("hover")}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                  selectedDataType === "hover"
                    ? "border-cyan-600 bg-cyan-50 text-cyan-600"
                    : "border-gray-200 bg-white text-gray-600 hover:border-cyan-300 hover:bg-gray-50"
                }`}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                <div className="text-left">
                  <div className="font-semibold text-sm">Hover Heatmap</div>
                  <div className="text-xs opacity-75">
                    Track attention & hover patterns
                  </div>
                </div>
              </button>
              <button
                onClick={() => onDataTypeChange("cursor-paths")}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                  selectedDataType === "cursor-paths"
                    ? "border-amber-600 bg-amber-50 text-amber-600"
                    : "border-gray-200 bg-white text-gray-600 hover:border-amber-300 hover:bg-gray-50"
                }`}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 5l7 7-7 7M5 5l7 7-7 7"
                  />
                </svg>
                <div className="text-left">
                  <div className="font-semibold text-sm">Cursor Paths</div>
                  <div className="text-xs opacity-75">
                    Analyze mouse movement patterns
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Show/Hide Elements Toggle */}
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-2 block">
              Element Visibility
            </label>
            <button
              onClick={() => onShowElementsChange(!showElements)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                showElements
                  ? "border-green-600 bg-green-50 text-green-600"
                  : "border-gray-200 bg-white text-gray-600 hover:border-green-300 hover:bg-gray-50"
              }`}
            >
              {showElements ? <EyeIcon /> : <EyeOffIcon />}
              <div className="text-left">
                <div className="font-semibold text-sm">
                  {showElements ? "Elements Visible" : "Elements Hidden"}
                </div>
                <div className="text-xs opacity-75">
                  {showElements
                    ? "Click overlays are shown"
                    : "Click overlays are hidden"}
                </div>
              </div>
            </button>
          </div>

          {/* Show/Hide Heatmap Overlay Toggle */}
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-2 block">
              Heatmap Data
            </label>
            <button
              onClick={() => onShowHeatmapChange(!showHeatmap)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                showHeatmap
                  ? "border-orange-600 bg-orange-50 text-orange-600"
                  : "border-gray-200 bg-white text-gray-600 hover:border-orange-300 hover:bg-gray-50"
              }`}
            >
              <HeatmapIcon />
              <div className="text-left">
                <div className="font-semibold text-sm">
                  {showHeatmap ? "Heatmap Visible" : "Heatmap Hidden"}
                </div>
                <div className="text-xs opacity-75">
                  {showHeatmap
                    ? "Heatmap overlay is shown"
                    : "Heatmap overlay is hidden"}
                </div>
              </div>
            </button>
          </div>

          {/* Viewport Filter Toggle */}
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-2 block">
              Viewport Filter
            </label>
            <button
              onClick={() => onShowAllViewportsChange(!showAllViewports)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                showAllViewports
                  ? "border-purple-600 bg-purple-50 text-purple-600"
                  : "border-blue-600 bg-blue-50 text-blue-600"
              }`}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                />
              </svg>
              <div className="text-left flex-1">
                <div className="font-semibold text-sm">
                  {showAllViewports ? "All Viewports" : "Current Viewport"}
                </div>
                <div className="text-xs opacity-75">
                  {showAllViewports
                    ? "Showing clicks from all screen sizes"
                    : "Filtered by snapshot viewport size"}
                </div>
              </div>
            </button>
            <div className="mt-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-600">
                {showAllViewports
                  ? "🌐 Data is normalized to 1920×1080 and aggregated across all resolutions"
                  : "📐 Only showing clicks that match the exact snapshot viewport dimensions"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Toggle Button - Always visible when closed */}
      {!sidebarOpen && (
        <button
          onClick={handleOpen}
          className="fixed left-4 sm:left-6 top-4 sm:top-6 z-9999 p-3 bg-linear-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl shadow-lg transition-all hover:shadow-2xl hover:scale-105"
          title="Open Settings"
        >
          <SettingsIcon />
        </button>
      )}
    </>
  );
}
