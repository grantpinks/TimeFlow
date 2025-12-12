# Sprint 10 Plan: Tasks Page UI/UX Modernization

**Objective:** Transform the Tasks page from a functional but plain interface into a visually stunning, animated, and highly interactive experience that aligns perfectly with the modern aesthetic of the AI Assistant page.

---

### **Phase 1: Foundation & Componentization**

The goal of this phase is to establish a solid foundation for a modern UI by creating a reusable and consistent component system.

**1. Create a `ui` Component Library:**
*   **Why:** The current page mixes complex logic with basic HTML elements styled with many utility classes. This makes the code hard to read, maintain, and update. The AI Assistant page's sleekness comes from consistent, well-defined components. We will replicate this pattern.
*   **Action:** Create a new directory: `timeflow/apps/web/src/components/ui`. This will house our new, generic UI components, similar to a library like `shadcn/ui`.

**2. Implement a `Card` Component:**
*   **Why:** The "blocky" feel of the current Tasks page comes from the use of simple `div`s with borders. A `Card` component with modern styling (softer shadows, rounded corners) will be the new container for our task columns and forms.
*   **Action:** Create `Card.tsx` in the `ui` directory. This component will have a base style with `rounded-xl`, a subtle `border`, and a light `box-shadow` to match the aesthetic of the AI Assistant page's UI elements. It will include sub-components like `CardHeader`, `CardTitle`, `CardContent`, and `CardFooter` for consistent internal structure.

**3. Create Styled Form Elements:**
*   **Why:** The default inputs, buttons, and select elements are a major source of the "defaulty" look. We need custom elements that align with our premium branding.
*   **Action:** Create the following files in the `ui` directory:
    *   `Button.tsx`: A button with variants (primary, secondary, destructive), proper hover and focus states, and a consistent size and shape (`rounded-xl`).
    *   `Input.tsx`: A styled text input with a consistent focus ring.
    *   `Select.tsx`: A styled dropdown.
    *   `Textarea.tsx`: A styled textarea.

---

### **Phase 2: Refactoring the Tasks Page**

With our UI toolkit ready, we'll now refactor the existing Tasks page to use it.

**1. Refactor the Main Page Layout:**
*   **Why:** The current layout is a simple grid. We can make it more dynamic and visually appealing.
*   **Action:** In `timeflow/apps/web/src/app/tasks/page.tsx`:
    *   Replace the main `div` containers for "Unscheduled," "Scheduled," and "Completed" with our new `Card` component.
    *   Update the header to be more prominent, perhaps using a larger font and incorporating a branding element like the Flow mascot.
    *   Replace all `<button>` and `<input>` elements with our new `Button` and `Input` components.

**2. Create a `TaskCard` Component:**
*   **Why:** The current `TaskList` component renders tasks as simple list items. To make them feel premium, each task should be its own self-contained, interactive card.
*   **Action:** Create a new component `TaskCard.tsx`. This card will:
    *   Use the `Card` component as its base.
    *   Display task details with better typography and spacing.
    *   Have subtle hover effects (e.g., a slight lift or a border highlight).
    *   Include interactive elements (like a "complete" button or an options menu) that are styled consistently.

**3. Refactor the `TaskList` Component:**
*   **Why:** The `TaskList` component will become a container for our new `TaskCard` components.
*   **Action:** Update `TaskList.tsx` to map over the tasks and render a `TaskCard` for each one, instead of rendering the HTML directly.

---

### **Phase 3: Adding Animations & "Premium" Feel**

This phase is what will truly bring the page to life.

**1. Animate Page Load:**
*   **Why:** Animations on load make the application feel faster and more responsive.
*   **Action:** Use `framer-motion` in `page.tsx`.
    *   Wrap the main container with a `<motion.div>`.
    *   Use `variants` to stagger the animation of the columns (`Card` components), so they fade in and slide up one after the other.

**2. Animate Task Cards:**
*   **Why:** Animating the task cards will make the UI feel dynamic and interactive.
*   **Action:** In `TaskList.tsx`:
    *   Wrap the list of `TaskCard`s in a `motion.div` that uses `staggerChildren` to animate them in sequentially.
    *   In `TaskCard.tsx`, add a `whileHover` prop to make the card scale up slightly when the user hovers over it.

**3. (Optional) Add Drag-and-Drop Functionality:**
*   **Why:** For a truly premium feel, allowing users to drag tasks between columns would be a major UX improvement. The project already has `@dnd-kit/core` as a dependency.
*   **Action:** Implement drag-and-drop using `@dnd-kit` to allow moving `TaskCard`s between the "Unscheduled," "Scheduled," and "Completed" `TaskList`s. Animate the drag and drop with `framer-motion`'s layout animations.

---

### **Phase 4: Finishing Touches**

**1. Refine the Habits Section:**
*   **Why:** The habits section has the same "blocky" and "defaulty" look.
*   **Action:** Apply the same `Card` and styled form components to the "Add Habit" form and the list of existing habits.

**2. Responsive Design:**
*   **Why:** A premium experience must be seamless across all screen sizes.
*   **Action:** Ensure all new components and layouts are fully responsive, adjusting gracefully from mobile to desktop.
