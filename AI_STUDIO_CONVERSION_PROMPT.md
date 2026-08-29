# Google AI Studio Conversion Guide & Master Prompt

This document provides instructions and a production-grade Master Prompt to convert this React + TypeScript Vite web application (**Reviseloop / Spaced Repetition Study App**) into a full native **Kotlin Android Application** using **Google AI Studio** (Gemini 1.5 Pro or Gemini 2.0 Flash / Pro).

---

## Table of Contents
1. [Overview](#overview)
2. [How to Use This Prompt in Google AI Studio](#how-to-use-this-prompt-in-google-ai-studio)
3. [Master Prompt for Google AI Studio](#master-prompt-for-google-ai-studio)
4. [Target Technical Architecture (Android Native)](#target-technical-architecture-android-native)

---

## Overview

The current web app is a feature-packed Spaced Repetition System (SRS) study application built with React, TypeScript, Vite, Tailwind CSS, Framer Motion, and IndexedDB.

Key features to port:
- **Hierarchical Knowledge Structure**: Subjects → Chapters → Topics → Subtopics → Question Folders → Questions.
- **Spaced Repetition Engine**: Dual-mode SRS engine supporting:
  - **Adaptive Mode** (SuperMemo / SM-2 based with Ease, Interval, Reps, Lapses, Hard/Good/Easy multipliers, preset configurations: Gentle, Standard, Exam).
  - **Leitner Box System** (7-box progression system).
- **Daily Review Queue & Catch-Up System**: Overdue, Due today, Review Ahead queues, and catch-up mode.
- **Media Vault & File Storage**: Attaching text notes, images, PDFs, audio notes to items with binary storage.
- **Study Stats & Streak Tracking**: Historical review logs, daily study counts, retention metrics, heatmap calendar, streak calculations.
- **Theme & Customization**: Dark/Light/System theme toggling, accent colors (Gold, Ink, Redpen, Forest, Plum).
- **Data Backup & Restore**: ZIP export/import and sample data loader.

---

## How to Use This Prompt in Google AI Studio

Follow these steps in **Google AI Studio** (https://aistudio.google.com/):

### Step 1: Prepare Google AI Studio Session
1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Click **Create New Prompt** (select **Chat Prompt** or **Freeform Prompt**).
3. Select Model: **Gemini 1.5 Pro** or **Gemini 2.0 Flash / Pro** (recommended for large context and code generation).
4. Set **System Instructions**:
   ```text
   You are an expert Principal Android Software Engineer proficient in Kotlin, Jetpack Compose, Room Database, Kotlin Coroutines & Flow, Hilt Dependency Injection, and Material Design 3. Your task is to rewrite web applications into production-grade native Android applications.
   ```
5. Adjust **Temperature**: `0.2` (lower temperature for precise code synthesis).

### Step 2: Pass Repository Context
If using Google AI Studio with GitHub repo context or codebase files:
- Import or paste key source files from this repository:
  - `src/types/index.ts` (Data models & interfaces)
  - `src/lib/srs.ts` (Spaced Repetition algorithm math)
  - `src/lib/db.ts` (Database helper & queue math)
  - `src/App.tsx` (App layout & navigation routes)
  - `src/views/*` (View implementations)
  - `src/components/*` (UI components)

### Step 3: Send the Master Prompt
Copy and paste the **Master Prompt** below into Google AI Studio.

---

## Master Prompt for Google AI Studio

```markdown
# MISSION
Act as a Principal Android Engineer. Convert the web application (React + TypeScript SRS Study App) in this GitHub repository into a fully functional, production-ready native Kotlin Android application using modern Android development practices.

---

# TARGET TECH STACK & ARCHITECTURE

1. **Language**: Kotlin 1.9+
2. **UI Framework**: Jetpack Compose with Material Design 3 (`androidx.compose.material3`)
3. **Architecture**: Clean Architecture + MVVM / MVI
   - `ui/`: Compose Screens, ViewModels, UI State classes (`StateFlow`, `SharedFlow`)
   - `data/`: Room Database (`RoomDatabase`, `@Entity`, `@Dao`), Repositories, Data Store for settings
   - `domain/`: Spaced Repetition (SRS) Engine, Queue Calculator, Streak Calculator
4. **Local Database**: Room DB (SQLite) for entities, schedules, review logs, and settings
5. **Asynchronous Processing**: Kotlin Coroutines & `Flow`
6. **Dependency Injection**: Hilt (`@HiltAndroidApp`, `@HiltViewModel`, `@Inject`)
7. **Navigation**: Jetpack Compose Navigation (`androidx.navigation.compose`)
8. **File Attachments**: Scoped Storage / Room for file metadata and internal storage (`context.filesDir`) for raw binary blobs (Images/PDFs/Audio).

---

# COMPREHENSIVE DATA MODEL SPECIFICATION

Translate the TypeScript types (`src/types/index.ts`) into Room Entities and Kotlin Data Classes:

### 1. Entities

```kotlin
// EntityType enum: SUBJECT, CHAPTER, TOPIC, SUBTOPIC, FOLDER, QUESTION
enum class EntityType { SUBJECT, CHAPTER, TOPIC, SUBTOPIC, FOLDER, QUESTION }
enum class PriorityLevel { LOW, NORMAL, HIGH, EXAM_CRITICAL }
enum class SrsRating { AGAIN, HARD, GOOD, EASY }
enum class SrsMode { ADAPTIVE, LEITNER }
enum class SrsPreset { GENTLE, STANDARD, EXAM }
enum class ThemeMode { LIGHT, DARK, SYSTEM }
enum class AccentColor { GOLD, INK, REDPEN, FOREST, PLUM }

@Entity(tableName = "schedule")
data class Schedule(
    val due: String, // YYYY-MM-DD
    val interval: Int = 0, // days
    val ease: Double = 2.5,
    val reps: Int = 0,
    val lapses: Int = 0,
    val lastReviewed: Long? = null,
    val box: Int = 1
)

@Entity(tableName = "subjects")
data class SubjectEntity(
    @PrimaryKey val id: String,
    val name: String,
    val description: String,
    val color: String,
    val icon: String,
    val targetDate: String?,
    val isArchived: Boolean = false,
    val sortOrder: Int = 0,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "chapters")
data class ChapterEntity(
    @PrimaryKey val id: String,
    val subjectId: String,
    val name: String,
    val description: String,
    val isArchived: Boolean = false,
    val sortOrder: Int = 0,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    @Embedded(prefix = "sched_") val schedule: Schedule? = null
)

@Entity(tableName = "topics")
data class TopicEntity(
    @PrimaryKey val id: String,
    val chapterId: String,
    val name: String,
    val description: String,
    val isArchived: Boolean = false,
    val sortOrder: Int = 0,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    @Embedded(prefix = "sched_") val schedule: Schedule? = null
)

@Entity(tableName = "subtopics")
data class SubtopicEntity(
    @PrimaryKey val id: String,
    val topicId: String,
    val name: String,
    val description: String,
    val isArchived: Boolean = false,
    val sortOrder: Int = 0,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    @Embedded(prefix = "sched_") val schedule: Schedule? = null
)

@Entity(tableName = "folders")
data class FolderEntity(
    @PrimaryKey val id: String,
    val parentType: EntityType,
    val parentId: String,
    val name: String,
    val description: String,
    val isArchived: Boolean = false,
    val sortOrder: Int = 0,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "questions")
data class QuestionEntity(
    @PrimaryKey val id: String,
    val parentType: EntityType,
    val parentId: String,
    val folderId: String? = null,
    val title: String,
    val prompt: String,
    val referenceType: String? = null,
    val referenceLocation: String? = null,
    val priority: PriorityLevel = PriorityLevel.NORMAL,
    val tags: List<String> = emptyList(),
    val description: String? = null,
    val note: String? = null,
    val isArchived: Boolean = false,
    val isSuspended: Boolean = false,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    @Embedded(prefix = "sched_") val schedule: Schedule
)

@Entity(tableName = "review_logs")
data class ReviewLogEntity(
    @PrimaryKey val id: String,
    val itemType: EntityType,
    val itemId: String,
    val at: Long = System.currentTimeMillis(),
    val date: String, // YYYY-MM-DD
    val rating: SrsRating,
    val prevDue: String,
    val newDue: String,
    val prevInterval: Int,
    val newInterval: Int,
    val reflection: String = "",
    val sessionId: String
)
```

---

# SPACED REPETITION ENGINE (SRS LOGIC)

Convert `src/lib/srs.ts` into a pure Kotlin domain utility/service `SrsEngine`:

```kotlin
object SrsEngine {
    fun calculateNextSchedule(
        current: Schedule,
        rating: SrsRating,
        settings: SrsSettings,
        todayIso: String = LocalDate.now().toString()
    ): Schedule {
        if (settings.mode == SrsMode.LEITNER) {
            val boxes = listOf(1, 3, 7, 14, 30, 60, 120)
            var box = current.box
            var lapses = current.lapses
            var reps = current.reps

            when (rating) {
                SrsRating.AGAIN -> {
                    box = maxOf(1, box - 2)
                    lapses++
                }
                SrsRating.GOOD -> box = minOf(7, box + 1)
                SrsRating.EASY -> box = minOf(7, box + 2)
                SrsRating.HARD -> { /* box stays same */ }
            }
            if (rating != SrsRating.AGAIN) reps++
            val interval = boxes[box - 1]
            val nextDue = LocalDate.parse(todayIso).plusDays(interval.toLong()).toString()

            return current.copy(
                due = nextDue,
                interval = interval,
                reps = reps,
                lapses = lapses,
                lastReviewed = System.currentTimeMillis(),
                box = box
            )
        }

        // Adaptive Mode (SM-2 variant)
        var ease = if (current.ease > 0) current.ease else settings.easeStart
        var iv = current.interval
        var reps = current.reps
        var lapses = current.lapses

        when {
            rating == SrsRating.AGAIN -> {
                iv = settings.firstAgain
                ease = maxOf(settings.easeMin, ease - 0.2)
                lapses++
            }
            reps == 0 -> {
                iv = when (rating) {
                    SrsRating.AGAIN -> settings.firstAgain
                    SrsRating.HARD -> settings.firstHard
                    SrsRating.GOOD -> settings.firstGood
                    SrsRating.EASY -> settings.firstEasy
                }
                if (rating == SrsRating.EASY) ease = minOf(settings.easeMax, ease + 0.1)
            }
            rating == SrsRating.HARD -> {
                iv = maxOf(iv + 1, (iv * settings.hardMult).roundToInt())
                ease = maxOf(settings.easeMin, ease - 0.15)
            }
            rating == SrsRating.GOOD -> {
                iv = maxOf(iv + 1, (iv * ease).roundToInt())
            }
            rating == SrsRating.EASY -> {
                iv = maxOf(iv + 2, (iv * ease * settings.easyBonus).roundToInt())
                ease = minOf(settings.easeMax, ease + 0.15)
            }
        }

        iv = iv.coerceIn(1, settings.maxInterval)
        if (rating != SrsRating.AGAIN) reps++

        val nextDue = LocalDate.parse(todayIso).plusDays(iv.toLong()).toString()

        return current.copy(
            due = nextDue,
            interval = iv,
            ease = ease,
            reps = reps,
            lapses = lapses,
            lastReviewed = System.currentTimeMillis()
        )
    }
}
```

---

# UI SCREENS & NAVIGATION

Implement Jetpack Compose screens corresponding to the React views:

1. **`TodayScreen`**:
   - Header with current streak count, daily review goal progress ring.
   - Action cards: "Due Today", "Overdue Catch-Up", "Review Ahead".
   - Active queue preview list with quick revision trigger.
2. **`LibraryScreen`**:
   - Grid/List of Subjects with progress indicators, question counts, and item maturity badges.
   - Fab to create new Subject.
3. **`SubjectScreen`, `ChapterScreen`, `TopicScreen`, `SubtopicScreen`, `FolderScreen`**:
   - Breadcrumb navigation header.
   - Accordion / Tree view or tabbed navigation of nested items.
   - Context menus for quick actions (Edit, Reschedule, Move, Attach Files, Delete).
4. **`QuestionDetailScreen`**:
   - Display question title, reference metadata, tags with dynamic colors, prompt, notes, attachments.
   - Action bar: "Revise Now", "Reschedule", "Move", "Edit", "Suspend".
5. **`ReviewSessionScreen` (Full-screen overlay/dialog)**:
   - Question prompt presentation with reveal answer button.
   - SRS Rating buttons: `Again`, `Hard`, `Good`, `Easy` with interval badges (`+1d`, `+3d`, etc.).
   - Session completion summary dialog.
6. **`StatsScreen`**:
   - Total questions, maturity breakdown (New, Learning, Established, Mature, Mastered).
   - Activity log calendar/heatmap.
7. **`SettingsScreen`**:
   - Theme switch (Light / Dark / System), Accent color picker.
   - SRS algorithm configuration presets (Gentle, Standard, Exam) & sliders.
   - Database export/import (JSON/ZIP) and Reset option.

---

# DELIVERABLES EXPECTED FROM AI STUDIO

When executing this conversion prompt, produce:
1. Complete Gradle build files (`build.gradle.kts` for project & app module with dependencies for Compose, Room, Hilt, Navigation, Lifecycle).
2. Data entities, DAOs (`SubjectDao`, `QuestionDao`, `ReviewLogDao`), TypeConverters, and `AppDatabase`.
3. Repository interfaces and implementations (`StudyRepositoryImpl`).
4. SRS algorithm engine (`SrsEngine`).
5. ViewModel classes (`TodayViewModel`, `ReviewViewModel`, `LibraryViewModel`).
6. Compose UI components & screens with Material 3 styling.

Now, begin generating the complete native Kotlin Android project codebase.
```

---

## Target Technical Architecture (Android Native)

### Project Layout
```text
app/src/main/java/com/reviseloop/app/
├── MainActivity.kt
├── ReviseloopApplication.kt
├── data/
│   ├── local/
│   │   ├── AppDatabase.kt
│   │   ├── Converters.kt
│   │   └── dao/
│   │       ├── SubjectDao.kt
│   │       ├── ChapterDao.kt
│   │       ├── TopicDao.kt
│   │       ├── SubtopicDao.kt
│   │       ├── FolderDao.kt
│   │       ├── QuestionDao.kt
│   │       └── ReviewLogDao.kt
│   ├── model/
│   │   └── Entities.kt
│   └── repository/
│       ├── StudyRepository.kt
│       └── StudyRepositoryImpl.kt
├── domain/
│   ├── model/
│   │   └── Models.kt
│   ├── srs/
│   │   ├── SrsEngine.kt
│   │   └── QueueCalculator.kt
│   └── usecase/
│       ├── GetDueQueueUseCase.kt
│       ├── SubmitReviewUseCase.kt
│       └── CalculateStreakUseCase.kt
├── di/
│   └── DatabaseModule.kt
└── ui/
    ├── navigation/
    │   └── NavGraph.kt
    ├── theme/
    │   ├── Color.kt
    │   ├── Theme.kt
    │   └── Type.kt
    ├── screens/
    │   ├── today/
    │   │   ├── TodayScreen.kt
    │   │   └── TodayViewModel.kt
    │   ├── library/
    │   │   ├── LibraryScreen.kt
    │   │   └── LibraryViewModel.kt
    │   ├── review/
    │   │   ├── ReviewSessionScreen.kt
    │   │   └── ReviewViewModel.kt
    │   ├── stats/
    │   │   ├── StatsScreen.kt
    │   │   └── StatsViewModel.kt
    │   └── settings/
    │       ├── SettingsScreen.kt
    │       └── SettingsViewModel.kt
    └── components/
        ├── ProgressRing.kt
        ├── TagChip.kt
        └── ContextMenu.kt
```
