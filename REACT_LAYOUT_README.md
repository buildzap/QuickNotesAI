# QuickNotes AI - Monday.com-like React Layout

This is a modern React implementation of QuickNotes AI with a Monday.com-like layout featuring a persistent top-level sidebar and nested sidebar for the Task module.

## 🚀 Features

### Layout Structure
- **Main Sidebar**: Persistent left sidebar with main navigation
- **Nested Task Sidebar**: Appears when Task module is selected
- **Responsive Design**: Mobile-friendly with collapsible sidebars
- **Dark/Light Theme**: Toggle between themes

### Navigation Structure
```
MainSidebar (left vertical)
 ├── Dashboard
 ├── Task (opens nested layout)
 │    ├── Add New Task ← default
 │    ├── Voice-to-Task
 │    ├── Task History
 │    ├── Progress Overview
 │    ├── Recent Activity
 │    ├── Google Calendar Sync
 │    └── Telegram Voice Integration
 ├── Team
 ├── Team Dashboard
 ├── Learn
 └── Settings
```

### Task Module Features
- **Add New Task**: Complete task creation form with voice input
- **Multilingual Voice-to-Task**: Support for 12+ languages
- **Task History**: View completed and past tasks
- **Progress Overview**: Productivity metrics and charts
- **Recent Activity**: Latest task updates and changes
- **Google Calendar Integration**: Sync tasks with calendar
- **Telegram Integration**: Create tasks via Telegram bot

## 🛠️ Technologies Used

- **React 18** with TypeScript
- **React Router v6** for navigation
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Vite** for build tooling

## 📦 Installation & Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```

3. **Build for Production**
   ```bash
   npm run build
   ```

## 🎨 UI Components

### Core Components
- `Layout.tsx` - Main layout with header and sidebar management
- `MainSidebar.tsx` - Top-level navigation sidebar
- `TaskSidebar.tsx` - Nested sidebar for task module

### Page Components
- `Dashboard.tsx` - Main dashboard with stats
- `AddTask.tsx` - Task creation with voice input
- `VoiceToText.tsx` - Multilingual voice-to-task
- `History.tsx` - Task history view
- `Progress.tsx` - Progress overview and metrics
- `Activity.tsx` - Recent activity feed
- `Calendar.tsx` - Google Calendar integration
- `Telegram.tsx` - Telegram bot integration

## 🎯 Key Features

### Voice Input Integration
- Real-time voice recording
- Multilingual support (12+ languages)
- Voice-to-text conversion
- Integration with task creation

### Responsive Design
- Collapsible sidebars for mobile
- Mobile-friendly navigation
- Adaptive layouts for different screen sizes

### Theme Support
- Light and dark theme toggle
- Persistent theme preference
- Smooth theme transitions

### Navigation
- Active tab highlighting
- Breadcrumb navigation
- Default route redirection
- Nested routing for task module

## 🔧 Configuration

### Tailwind CSS
Custom colors and theme configuration in `tailwind.config.js`:
- Primary colors matching QuickNotes AI brand
- Custom shadows and animations
- Dark mode support

### Routing
- Default route: `/dashboard`
- Task module routes: `/task/*`
- Nested routing for task features

## 📱 Mobile Support

- Collapsible sidebars
- Touch-friendly navigation
- Responsive task forms
- Mobile-optimized voice input

## 🎨 Design System

### Colors
- Primary: `#6366f1` (Indigo)
- Accent: `#00b894` (Green)
- Background: Light gray gradients
- Text: Dark gray with proper contrast

### Typography
- Font: Inter (Google Fonts)
- Consistent heading hierarchy
- Readable text sizes

### Components
- Consistent card designs
- Soft shadows and borders
- Smooth transitions and animations
- Professional spacing and layout

## 🚀 Future Enhancements

- Real-time collaboration features
- Advanced task analytics
- Integration with external APIs
- Enhanced voice recognition
- Team management features
- Advanced calendar sync

## 📄 File Structure

```
src/
├── components/
│   ├── Layout.tsx
│   ├── MainSidebar.tsx
│   └── TaskSidebar.tsx
├── pages/
│   ├── Dashboard.tsx
│   ├── Team.tsx
│   ├── TeamDashboard.tsx
│   ├── Learn.tsx
│   ├── Settings.tsx
│   └── task/
│       ├── AddTask.tsx
│       ├── VoiceToText.tsx
│       ├── History.tsx
│       ├── Progress.tsx
│       ├── Activity.tsx
│       ├── Calendar.tsx
│       └── Telegram.tsx
├── App.tsx
├── main.tsx
└── index.css
```

## 🎯 Usage

1. Navigate to the main sidebar to access different modules
2. Click "Task" to open the nested task sidebar
3. Use voice input or manual entry to create tasks
4. Monitor progress and activity through dedicated pages
5. Sync with Google Calendar and Telegram for enhanced workflow

This React implementation provides a modern, scalable foundation for QuickNotes AI with a professional Monday.com-like interface that enhances productivity and user experience.
