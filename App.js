import React, { useEffect, useMemo, useRef, useState } from "react"; import { SafeAreaView, View, Text, Pressable, FlatList } from "react-native"; import AsyncStorage from "@react-native-async-storage/async-storage";

// ---- Types ---- type CategoryKey = | "TAI_CHI" | "CHAIR_YOGA" | "WALKING" | "BALANCE" | "MOBILITY" | "CORE" | "RESTORATIVE";

type Step = { name: string; durationSec?: number; reps?: number };

type Session = { title: string; totalMinutes: number; steps: Step[] };

// ---- Constants ---- const CATEGORIES: Record<CategoryKey, { title: string; subtitle: string }> = { TAI_CHI: { title: "Tai Chi", subtitle: "Slow forms for balance & flow" }, CHAIR_YOGA: { title: "Chair Yoga", subtitle: "Gentle mobility with support" }, WALKING: { title: "Walking", subtitle: "Steady pace, mindful breath" }, BALANCE: { title: "Balance", subtitle: "Stability & ankle strength" }, MOBILITY: { title: "Mobility", subtitle: "Hips/shoulders, pain-free range" }, CORE: { title: "Core (Gentle)", subtitle: "Deep core activation" }, RESTORATIVE: { title: "Restorative", subtitle: "Breathwork & recovery" }, };

const ROTATION: CategoryKey[] = [ "TAI_CHI", "CHAIR_YOGA", "WALKING", "BALANCE", "MOBILITY", "CORE", "RESTORATIVE", ];

const MIN_LEVEL = 1; const MAX_LEVEL = 5;

// ---- Helpers ---- const todayEpoch = () => Math.floor(Date.now() / 86400000); // days since epoch

function minutes(base: number, level: number) { return base + (level - 1) * 2; // +2 min each level }

function reps(base: number, level: number) { return base + (level - 1) * 2; }

function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)); }

// Build session by category & level function buildSession(key: CategoryKey, level: number): Session { const L = clamp(level, MIN_LEVEL, MAX_LEVEL); switch (key) { case "TAI_CHI": return { title: "Tai Chi Flow", totalMinutes: minutes(10, L), steps: [ { name: "Breath & Posture", durationSec: 60 }, { name: "Commencement", reps: reps(4, L) }, { name: "Parting the Wild Horse’s Mane", reps: reps(6, L) }, { name: "Wave Hands Like Clouds", reps: reps(6, L) }, { name: "Closing", durationSec: 60 }, ], }; case "CHAIR_YOGA": return { title: "Chair Yoga Mobility", totalMinutes: minutes(12, L), steps: [ { name: "Neck circles (gentle)", reps: reps(6, L) }, { name: "Seated cat-cow", reps: reps(8, L) }, { name: "Hip marches", reps: reps(10, L) }, { name: "Ankle pumps", reps: reps(12, L) }, { name: "Box breathing", durationSec: 90 }, ], }; case "WALKING": return { title: "Mindful Walk", totalMinutes: minutes(15, L), steps: [ { name: "Warmup stroll", durationSec: 120 }, { name: "Steady pace", durationSec: minutes(10, L) * 60 }, { name: "Cool-down & stretch", durationSec: 120 }, ], }; case "BALANCE": return { title: "Balance & Ankle Strength", totalMinutes: minutes(10, L), steps: [ { name: "Heel-to-toe hold (support if needed)", durationSec: 30 }, { name: "Single-leg stand (both sides)", durationSec: 30 }, { name: "Side steps along counter", reps: reps(12, L) }, { name: "Calf raises", reps: reps(12, L) }, { name: "Ankle alphabet (both feet)", reps: 1 }, ], }; case "MOBILITY": return { title: "Gentle Mobility", totalMinutes: minutes(12, L), steps: [ { name: "Shoulder rolls", reps: reps(10, L) }, { name: "Thoracic open books", reps: reps(8, L) }, { name: "Hip hinges (pain-free)", reps: reps(8, L) }, { name: "90/90 hip switches (assisted)", reps: reps(6, L) }, { name: "Diaphragmatic breathing", durationSec: 90 }, ], }; case "CORE": return { title: "Deep Core Activation", totalMinutes: minutes(10, L), steps: [ { name: "Pelvic tilts (supine or chair)", reps: reps(10, L) }, { name: "Dead bug / seated opposite taps", reps: reps(8, L) }, { name: "Side wall press (anti-rotation)", reps: reps(8, L) }, { name: "Bracing & breathe", durationSec: 60 }, ], }; case "RESTORATIVE": return { title: "Restorative & Breath", totalMinutes: minutes(8, L), steps: [ { name: "Box breathing", durationSec: 120 }, { name: "Body scan (seated)", durationSec: 180 }, { name: "Supported forward fold (chair)", durationSec: 60 }, ], }; } }

// ---- Storage Keys ---- const K_LEVEL = "level"; const K_STREAK = "streak"; const K_LAST_DONE = "last_done"; // day-epoch

async function getInt(key: string, fallback = 0) { const v = await AsyncStorage.getItem(key); return v != null ? parseInt(v, 10) : fallback; }

async function setInt(key: string, value: number) { await AsyncStorage.setItem(key, String(value)); }

// ---- UI ---- const Button = ({ onPress, children }: { onPress?: () => void; children: React.ReactNode }) => ( <Pressable onPress={onPress} style={({ pressed }) => ({ padding: 14, borderRadius: 16, borderWidth: 1, alignItems: "center", marginVertical: 6, opacity: pressed ? 0.7 : 1, })}

> 

<Text style={{ fontSize: 16, fontWeight: "600" }}>{children}</Text>

  </Pressable>
);const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => ( <View style={{ borderWidth: 1, borderRadius: 16, padding: 16, marginVertical: 8 }}>{children}</View> );

export default function App() { const [level, setLevel] = useState<number>(1); const [streak, setStreak] = useState<number>(0); const [lastDone, setLastDone] = useState<number>(-1); const [playing, setPlaying] = useState<boolean>(false); const [stepIndex, setStepIndex] = useState<number>(0); const [remaining, setRemaining] = useState<number>(0);

const dayEpoch = todayEpoch(); const rotationIndex = ((dayEpoch % ROTATION.length) + ROTATION.length) % ROTATION.length; const todayKey = ROTATION[rotationIndex]; const meta = CATEGORIES[todayKey];

const session = useMemo(() => buildSession(todayKey, level), [todayKey, level]); const currentStep = session.steps[stepIndex];

// Load persisted state useEffect(() => { (async () => { const [L, S, D] = await Promise.all([ getInt(K_LEVEL, 1), getInt(K_STREAK, 0), getInt(K_LAST_DONE, -1), ]); setLevel(L || 1); setStreak(S || 0); setLastDone(D ?? -1); })(); }, []);

// Timer effect for duration steps useEffect(() => { if (!playing || !currentStep?.durationSec) return; setRemaining(currentStep.durationSec); let cancelled = false; const id = setInterval(() => { if (cancelled) return; setRemaining((r) => { if (r <= 1) { clearInterval(id); return 0; } return r - 1; }); }, 1000); return () => { cancelled = true; clearInterval(id); }; }, [playing, stepIndex]);

const handleComplete = async () => { const newStreak = lastDone === dayEpoch - 1 ? streak + 1 : 1; const shouldLevelUp = newStreak % 7 === 0 && level < MAX_LEVEL; const newLevel = shouldLevelUp ? level + 1 : level;

setStreak(newStreak);
setLevel(newLevel);
setLastDone(dayEpoch);
await setInt(K_STREAK, newStreak);
await setInt(K_LEVEL, newLevel);
await setInt(K_LAST_DONE, dayEpoch);

};

const handleSkip = async () => { setStreak(0); setLastDone(dayEpoch); await setInt(K_STREAK, 0); await setInt(K_LAST_DONE, dayEpoch); };

const easier = async () => { const L = clamp(level - 1, MIN_LEVEL, MAX_LEVEL); setLevel(L); await setInt(K_LEVEL, L); }; const harder = async () => { const L = clamp(level + 1, MIN_LEVEL, MAX_LEVEL); setLevel(L); await setInt(K_LEVEL, L); };

const nextStep = async () => { const next = stepIndex + 1; if (next >= session.steps.length) { // session done await handleComplete(); setPlaying(false); setStepIndex(0); setRemaining(0); } else { setStepIndex(next); setRemaining(0); } };

return ( <SafeAreaView style={{ flex: 1, padding: 16, gap: 12 }}> {!playing ? ( <View style={{ gap: 12, flex: 1 }}> <Text style={{ fontSize: 24, fontWeight: "800" }}>Low Impact Daily Trainer</Text> <Text style={{ fontSize: 20, fontWeight: "700" }}>{meta.title}</Text> <Text style={{ opacity: 0.8 }}>{meta.subtitle}</Text>

<Card>
        <Text style={{ fontSize: 18, fontWeight: "700" }}>{session.title}</Text>
        <Text>Difficulty: {level} / {MAX_LEVEL}</Text>
        <Text>Estimated time: {session.totalMinutes} min</Text>
        <Text>Streak: {streak} day{streak === 1 ? "" : "s"}</Text>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
          <Button onPress={easier}>Easier</Button>
          <Button onPress={harder}>Harder</Button>
        </View>
      </Card>

      <Card>
        <FlatList
          data={session.steps}
          keyExtractor={(item, idx) => item.name + idx}
          renderItem={({ item }) => (
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginVertical: 6 }}>
              <Text style={{ flex: 1 }}>{item.name}</Text>
              {item.durationSec ? (
                <Text style={{ fontWeight: "700" }}>
                  {Math.floor(item.durationSec / 60)}m {item.durationSec % 60}s
                </Text>
              ) : item.reps ? (
                <Text style={{ fontWeight: "700" }}>x{item.reps}</Text>
              ) : (
                <Text />
              )}
            </View>
          )}
        />
      </Card>

      <View style={{ marginTop: "auto" }}>
        <Button onPress={handleSkip}>Skip/Swap Today</Button>
        <Button onPress={() => setPlaying(true)}>Start Session</Button>
        {lastDone === dayEpoch && (
          <Text style={{ marginTop: 6, fontStyle: "italic" }}>Completed today</Text>
        )}
      </View>
    </View>
  ) : (
    <View style={{ flex: 1, gap: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: "800" }}>{session.title}</Text>
      <View style={{ height: 10, borderRadius: 999, overflow: "hidden", borderWidth: 1 }}>
        <View
          style={{
            height: 10,
            width: `${((stepIndex + 1) / session.steps.length) * 100}%`,
          }}
        />
      </View>

      {currentStep ? (
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 26, fontWeight: "700" }}>{currentStep.name}</Text>
          {currentStep.durationSec ? (
            <Text style={{ fontSize: 18 }}>Time: {remaining}s</Text>
          ) : currentStep.reps ? (
            <Text style={{ fontSize: 18 }}>Reps: x{currentStep.reps} (self-paced)</Text>
          ) : null}
        </View>
      ) : (
        <View style={{ alignItems: "center", gap: 6 }}>
          <Text style={{ fontSize: 24, fontWeight: "800" }}>Session complete!</Text>
          <Text>Great job showing up today.</Text>
        </View>
      )}

      <View style={{ marginTop: "auto" }}>
        <Button onPress={() => { setPlaying(false); setStepIndex(0); setRemaining(0); }}>Exit</Button>
        <Button onPress={nextStep}>{stepIndex + 1 >= session.steps.length ? "Finish" : "Next"}</Button>
      </View>
    </View>
  )}

  <Text style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
    ⚠️ Always consult a healthcare professional before starting a new exercise plan. Stop if you feel pain, dizziness, or shortness of breath.
  </Text>
</SafeAreaView>

); }

