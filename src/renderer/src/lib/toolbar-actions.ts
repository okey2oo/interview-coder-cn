import {
  ArrowDown,
  ArrowLeftRight,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Camera,
  ChevronDown,
  ChevronUp,
  CircleStop,
  Crop,
  ImagePlus,
  Layers,
  Lightbulb,
  Maximize2,
  Mic,
  Minimize2,
  MousePointer2,
  Sun,
  SunDim,
  Zap,
  type LucideIcon
} from 'lucide-react'
import type { AppMode } from './store/settings'

/** Action names the main process accepts from a toolbar click */
export type ToolbarActionName = Parameters<Window['api']['triggerAction']>[0]

export type ToolbarAction = {
  /** Also the shortcut action name, so the same key binding can be shown in help */
  action: ToolbarActionName
  Icon: LucideIcon
  label: string
}

/** Shown in both modes, after each mode's own buttons */
const COMMON_ACTIONS: ToolbarAction[] = [
  { action: 'ignoreOrEnableMouse', Icon: MousePointer2, label: '切换鼠标穿透' },
  { action: 'pageUp', Icon: ChevronUp, label: '向上翻页' },
  { action: 'pageDown', Icon: ChevronDown, label: '向下翻页' },
  { action: 'moveMainWindowUp', Icon: ArrowUp, label: '向上移动窗口' },
  { action: 'moveMainWindowLeft', Icon: ArrowLeft, label: '向左移动窗口' },
  { action: 'moveMainWindowDown', Icon: ArrowDown, label: '向下移动窗口' },
  { action: 'moveMainWindowRight', Icon: ArrowRight, label: '向右移动窗口' },
  { action: 'increaseOpacity', Icon: Sun, label: '提高不透明度（更清晰）' },
  { action: 'decreaseOpacity', Icon: SunDim, label: '提高透明度（更透明）' }
]

/**
 * Buttons of the overlay toolbar per mode, in display order. Drives both the
 * toolbar itself and its description on the help page, so the two never drift
 * apart. `hideOrShowMainWindow` is intentionally absent: hiding the window also
 * hides the toolbar, leaving no way to click the window back. So is 清空对话:
 * a hover-triggered button must not be able to wipe the conversation.
 */
export const TOOLBAR_ACTIONS: Record<AppMode, ToolbarAction[]> = {
  screenshot: [
    { action: 'takeScreenshot', Icon: Camera, label: '截图解题（新开对话）' },
    { action: 'appendScreenshot', Icon: ImagePlus, label: '追加截图' },
    { action: 'pickCaptureRegion', Icon: Crop, label: '框选截图区域' },
    { action: 'stopSolutionStream', Icon: CircleStop, label: '停止生成' },
    { action: 'toggleMiniBar', Icon: Minimize2, label: '收起为极简悬浮条（解答看手机）' },
    ...COMMON_ACTIONS,
    { action: 'toggleTranscription', Icon: Mic, label: '开始/暂停语音转录' },
    { action: 'cycleScene', Icon: Layers, label: '切换到下一个提示词场景' },
    { action: 'switchMode', Icon: ArrowLeftRight, label: '切换到对话模式' }
  ],
  conversation: [
    { action: 'generateHint', Icon: Lightbulb, label: '立即出提示（没有新内容时换个说法重出）' },
    { action: 'toggleHintMode', Icon: Zap, label: '切换自动/手动出提示' },
    { action: 'stopSolutionStream', Icon: CircleStop, label: '停止生成提示' },
    { action: 'toggleTranscription', Icon: Mic, label: '开始/停止监听对方说话' },
    { action: 'toggleMiniBar', Icon: Minimize2, label: '收起为极简悬浮条（提示看手机）' },
    ...COMMON_ACTIONS,
    { action: 'cycleScene', Icon: Layers, label: '切换到下一个提示词场景' },
    { action: 'switchMode', Icon: ArrowLeftRight, label: '切换到截图模式' }
  ]
}

const MINI_BAR_PAGING: ToolbarAction[] = [
  { action: 'pageUp', Icon: ChevronUp, label: '向上翻页（手机同步翻页）' },
  { action: 'pageDown', Icon: ChevronDown, label: '向下翻页（手机同步翻页）' }
]

/**
 * The 极简悬浮条's buttons per mode, after its drag grip. It stands in for the
 * main window while the answer or the hints are read on a phone (手机同步), so
 * it keeps what starts them, paging (which pages the phones too, for when an
 * exam app swallows the shortcuts: hover dwell then pages without a click) and
 * the way back.
 */
export const MINI_BAR_ACTIONS: Record<AppMode, ToolbarAction[]> = {
  screenshot: [
    { action: 'takeScreenshot', Icon: Camera, label: '截图解题（新开对话）' },
    { action: 'appendScreenshot', Icon: ImagePlus, label: '追加截图' },
    ...MINI_BAR_PAGING,
    { action: 'toggleMiniBar', Icon: Maximize2, label: '展开完整窗口' }
  ],
  conversation: [
    { action: 'generateHint', Icon: Lightbulb, label: '立即出提示（没有新内容时换个说法重出）' },
    {
      action: 'toggleTranscription',
      Icon: Mic,
      label: '开始/停止监听对方说话（停止时图标带斜线）'
    },
    ...MINI_BAR_PAGING,
    { action: 'toggleMiniBar', Icon: Maximize2, label: '展开完整窗口' }
  ]
}
