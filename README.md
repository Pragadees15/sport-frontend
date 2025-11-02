# 🏆 SportsFeed - Sports Social Platform Frontend

A modern, feature-rich sports social media platform built with React and TypeScript. Connect with athletes, coaches, and sports enthusiasts, share content, stream live, and engage with a gamified experience.

![React](https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7.1.9-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4.1-38B2AC?logo=tailwind-css&logoColor=white)

## ✨ Features

### 🏠 Core Social Features
- **Feed & Posts** - Create, share, and interact with text, image, video, and audio posts
- **Comments & Engagement** - Real-time commenting, likes, and shares
- **User Profiles** - Comprehensive profiles with sports categories, verification badges, and statistics
- **Follow System** - Follow athletes, coaches, and sports enthusiasts
- **Discover** - Find new athletes and content tailored to your interests

### 💬 Real-Time Communication
- **Messaging** - One-on-one and group messaging with Socket.IO
- **Notifications** - Real-time push notifications for interactions
- **Presence** - See who's online and active

### 🎮 Gamification System
- **XP & Leveling** - Earn experience points and level up through engagement
- **Achievements & Badges** - Unlock achievements for milestones
- **Daily/Weekly Quests** - Complete challenges for XP and token rewards
- **Leaderboards** - Compete with other users
- **Streaks** - Track login and activity streaks

### 🎥 Media & Content
- **Livestreaming** - Create and watch live streams
- **Video Library** - Upload, organize, and watch sports videos
- **Media Upload** - Cloudinary integration for images and videos
- **Video Player** - Enhanced video playback experience

### 🗺️ Location Features
- **Interactive Maps** - Discover athletes and events near you using Leaflet
- **Location Check-ins** - Share your training locations
- **Heat Maps** - Visualize activity hotspots

### 👤 User Management
- **Role-Based Access** - Multiple user roles (user, coach, aspirant, admin)
- **Verification System** - Document-based verification for coaches and athletes
- **Profile Completion** - Guided onboarding flow
- **Privacy Controls** - Manage profile visibility and settings

### 💎 Token Economy
- **Virtual Currency** - Earn and spend tokens
- **Membership System** - Premium memberships and exclusive content
- **Reward System** - Earn tokens through quests and engagement
- **Token Wallet** - Track your token balance and transactions

### 🛡️ Security & Moderation
- **Content Moderation** - AI-powered content filtering
- **Authentication** - Secure auth with Supabase and Google OAuth
- **Rate Limiting** - Protection against abuse
- **Error Handling** - Comprehensive error boundaries and handling

## 🚀 Tech Stack

### Core Framework
- **React 18.3** - UI library with hooks
- **TypeScript** - Type-safe development
- **Vite 7** - Fast build tool and dev server

### Styling & UI
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Animation library
- **Lucide React** - Beautiful icon library

### State Management
- **Zustand** - Lightweight state management
- **React Router** - Client-side routing

### Backend Integration
- **Supabase** - Authentication and database
- **Socket.IO Client** - Real-time communication
- **REST API** - Backend service integration

### Forms & Validation
- **React Hook Form** - Form state management
- **Yup** - Schema validation

### Maps & Location
- **React Leaflet** - Interactive maps component
- **Leaflet** - Open-source mapping library

### Development Tools
- **ESLint** - Code linting
- **Stylelint** - CSS linting
- **TypeScript ESLint** - TypeScript-specific linting

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** 18+ ([Download](https://nodejs.org/))
- **npm** 8+ (comes with Node.js)
- **Git** ([Download](https://git-scm.com/))

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd "New Sport"
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```bash
   cp env.example .env
   ```
   
   Fill in your environment variables. You'll need:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_API_URL=http://localhost:5000
   VITE_SOCKET_URL=http://localhost:5000
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:5173` (or the port Vite assigns)

## 📜 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production (outputs to `dist/`) |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint to check code quality |
| `npm run lint:css` | Run Stylelint to check CSS quality |
| `npm run lint:css:fix` | Fix auto-fixable CSS linting issues |

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── admin/          # Admin panel components
│   ├── auth/           # Authentication components
│   ├── discover/       # Discovery page components
│   ├── expert/         # Expert dashboard
│   ├── feed/           # Feed components
│   ├── gamification/   # Gamification UI (quests, achievements)
│   ├── home/           # Home page components
│   ├── layout/         # Layout components (header, nav)
│   ├── map/            # Map-related components
│   ├── messaging/      # Messaging components
│   ├── modals/         # Modal components
│   ├── play/           # Play page (livestreams, videos)
│   ├── posts/          # Post-related components
│   ├── profile/        # Profile components
│   ├── ui/             # Reusable UI components
│   └── verification/   # Verification components
├── pages/              # Page components (routes)
├── services/           # API and external services
├── store/              # Zustand state stores
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
├── hooks/              # Custom React hooks
├── data/               # Static data
├── App.tsx             # Main app component
├── main.tsx            # Application entry point
└── index.css           # Global styles
```

## 🔧 Configuration

### Vite Configuration

The `vite.config.ts` file includes:
- React plugin configuration
- Proxy setup for API and Socket.IO
- Build optimizations (code splitting, minification)
- Source map generation for production debugging

### Tailwind Configuration

Tailwind CSS is configured in `tailwind.config.js` with custom theme extensions and utilities.

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `VITE_API_URL` | Backend API URL | Yes |
| `VITE_SOCKET_URL` | Socket.IO server URL | Yes |

## 🎨 Key Features Implementation

### Routing
The app uses React Router with protected routes. Key routes include:
- `/auth` - Authentication page
- `/dashboard/home` - Home feed
- `/dashboard/discover` - Discovery page
- `/dashboard/messages` - Messaging
- `/dashboard/play` - Livestreams and videos
- `/dashboard/map` - Map view
- `/dashboard/profile` - User profile
- `/profile/:username` - Public profiles
- `/post/:id` - Post detail view

### State Management
- **Auth Store** (`store/authStore.ts`) - User authentication state
- **App Store** (`store/appStore.ts`) - Global application state
- **Socket Store** (`store/socketStore.ts`) - Real-time connection state

### Real-Time Features
Socket.IO integration for:
- Live notifications
- Real-time messaging
- Presence indicators
- Livestream updates

## 🧪 Development Tips

1. **Hot Reload** - Vite provides instant HMR (Hot Module Replacement)
2. **TypeScript** - Leverage type checking with `tsc --noEmit`
3. **Component Structure** - Components are organized by feature
4. **Styling** - Use Tailwind utility classes for consistent styling
5. **State** - Use Zustand for component-level state, props for local state

## 🚢 Building for Production

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Preview the build**
   ```bash
   npm run preview
   ```

3. **Deploy**
   - The `dist/` folder contains optimized production assets
   - Deploy to your preferred hosting service (Vercel, Netlify, etc.)

## 🔗 Backend Integration

This frontend connects to a Node.js/Express backend. Ensure the backend is running and accessible at the URL specified in `VITE_API_URL`.

See the `backend/README.md` for backend setup instructions.

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run linting: `npm run lint`
4. Test your changes
5. Submit a pull request

## 📝 Code Style

- Use TypeScript for all new files
- Follow React hooks best practices
- Use functional components
- Keep components focused and reusable
- Use Tailwind CSS for styling
- Follow existing naming conventions

## 🐛 Troubleshooting

### Common Issues

**Port already in use**
```bash
# Kill process on port 5173 (or specified port)
# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:5173 | xargs kill
```

**Environment variables not loading**
- Ensure `.env` file is in the root directory
- Restart the dev server after adding new variables
- Variable names must start with `VITE_`

**Build errors**
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Check TypeScript errors: `npx tsc --noEmit`

## 📄 License

[Specify your license here]

## 🙏 Acknowledgments

- Built with [React](https://react.dev/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Powered by [Vite](https://vitejs.dev/)
- Maps by [Leaflet](https://leafletjs.com/)
- Icons by [Lucide](https://lucide.dev/)

---

**Happy coding! 🚀**
