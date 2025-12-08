# Design System: "Arcane Stone"

**Theme:** Immersive Dark Fantasy / Tabletop RPG Interface.
**Core Aesthetic:** Dark, tactile, and glassmorphic. It combines deep stone textures with glowing magical accents (amber, emerald, ruby) and medieval typography.

## 1. The Style Prompt

> **Visual Style Requirement:**
> Create a dark-mode web application with a "Dark Fantasy TTRPG" aesthetic.
>
> **Color Palette:**
> *   **Backgrounds:** Deep warm grays (`stone-900` to `stone-950`).
> *   **Surfaces:** Translucent dark stone (`stone-800` with 40-80% opacity) utilizing `backdrop-blur`.
> *   **Primary Accent:** Magical Gold/Amber (`amber-500` to `amber-600`) for active states, buttons, and highlights.
> *   **Functional Colors:**
>     *   Music/Relaxed: Muted Forest Green (`#4A785A`).
>     *   Ambience/Neutral: Earthy Orange/Sky Blue depending on context.
>     *   Combat/Intense: Deep Crimson (`#9E3E3D`).
>
> **Typography:**
> *   **Headings:** Use "MedievalSharp" (Google Font) for a fantasy feel.
> *   **Body:** System sans-serif for readability (`Inter` or default Tailwind sans).
>
> **UI Principles:**
> *   **Glassmorphism:** All containers, headers, and modals must use `backdrop-blur-xl` with thin, semi-transparent light borders (`border-stone-700/50`).
> *   **Roundness:** Generous corner radii. Buttons use `rounded-xl` or `rounded-full`. Modals use `rounded-3xl`.
> *   **Tactile Feedback:** Buttons should scale down slightly when clicked (`active:scale-95`) and lift up slightly on hover (`hover:-translate-y-0.5`).
> *   **Lighting:** Use shadows (`shadow-2xl`) to create depth. Active elements should "glow" using drop shadows and border rings.
> *   **Gradients:** Use subtle diagonal gradients (`bg-gradient-to-br`) for sound tiles or featured cards.

## 2. Implementation Code (Tailwind CSS)

### A. Head Section (HTML)
Add the font imports and the custom Tailwind configuration.

```html
<head>
    <!-- 1. Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=MedievalSharp&display=swap" rel="stylesheet">

    <!-- 2. Tailwind Setup -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      tailwind.config = {
        darkMode: 'class', // Preserve dark mode class strategy
        theme: {
          extend: {
            fontFamily: {
              medieval: ['"MedievalSharp"', 'cursive'], // Usage: font-medieval
              sans: ['ui-sans-serif', 'system-ui', 'sans-serif'],
            },
            colors: {
              stone: {
                850: '#24211e', // Custom in-between shade if needed
              },
              // Mapping primary to amber for ease of use if needed, or use amber directly
              primary: {
                50: '#fffbeb',
                100: '#fef3c7',
                200: '#fde68a',
                300: '#fcd34d',
                400: '#fbbf24',
                500: '#f59e0b',
                600: '#d97706',
                700: '#b45309',
                800: '#92400e',
                900: '#78350f',
                950: '#451a03',
              }
            },
            keyframes: {
               glow: {
                 '0%, 100%': { transform: 'scale(1)', boxShadow: '0 0 10px rgba(255, 255, 255, 0.1)' },
                 '50%': { transform: 'scale(1.02)', boxShadow: '0 0 20px rgba(255, 255, 255, 0.3)' },
               },
               'modal-in': {
                 '0%': { opacity: '0', transform: 'scale(0.95) translateY(10px)' },
                 '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
               },
               'modal-out': {
                 '0%': { opacity: '1', transform: 'scale(1) translateY(0)' },
                 '100%': { opacity: '0', transform: 'scale(0.95) translateY(10px)' },
               }
             },
             animation: {
               glow: 'glow 2s ease-in-out infinite',
               'modal-in': 'modal-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
               'modal-out': 'modal-out 0.15s ease-in forwards',
             }
          },
        },
      }
    </script>
</head>
```

### B. Common Component Classes (Cheat Sheet)

**1. The "Glass Panel" (Headers, Modals, Lists)**
`className="bg-stone-900/60 backdrop-blur-2xl border border-stone-700/50 shadow-2xl rounded-3xl"`

**2. The "Primary Action" Button (Save, Create, Play)**
`className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-6 rounded-xl shadow-lg hover:shadow-amber-900/20 transition-all hover:scale-105 active:scale-95"`

**3. The "Secondary/Ghost" Button (Cancel, Edit, Settings)**
`className="text-stone-400 hover:text-white p-2 hover:bg-stone-700/50 rounded-xl border border-transparent hover:border-stone-600/30 transition-all"`

**4. Input Fields**
`className="bg-stone-800/40 border border-stone-600/50 rounded-xl w-full py-2 px-3 text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all placeholder-stone-500"`
