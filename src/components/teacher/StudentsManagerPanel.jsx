import { useEffect, useMemo, useState } from "react";
import { Bot, Gift, MinusCircle, PlusCircle, Swords, Trash2, UserPlus } from "lucide-react";
import { editStudentAvatar } from "../../services/aiClient.ts";
import {
  addStudent,
  grantStudentReward,
  loadStudentsState,
  recordStudentBattle,
  removeStudent,
  removeStudentReward,
  updateStudentAvatar,
} from "../../utils/studentsStore.js";
import Badge from "../../ui/Badge.jsx";
import Button from "../../ui/Button.jsx";
import Card from "../../ui/Card.jsx";

function buildBattlePower(student) {
  if (!student) return 0;
  const rewardPower = (student.rewards?.coins ?? 0) * 0.4 + (student.rewards?.stars ?? 0) * 2;
  const badgePower = (student.rewards?.badges?.length ?? 0) * 3;
  const ratingPower = (student.battle?.rating ?? 1000) / 60;
  const randomBoost = Math.random() * 25;
  return rewardPower + badgePower + ratingPower + randomBoost;
}

function AvatarPreview({ avatar, name }) {
  const safe = avatar ?? {
    emoji: "🧠",
    palette: { primary: "#4f46e5", secondary: "#06b6d4", accent: "#22c55e" },
    tagline: `${name} invata cu incredere.`,
    accessories: [],
  };
  const gradient = `linear-gradient(135deg, ${safe.palette?.primary ?? "#4f46e5"}, ${safe.palette?.secondary ?? "#06b6d4"})`;
  return (
    <div className="rounded-2xl border border-indigo-200 bg-white p-3">
      <div
        className="flex h-20 w-20 items-center justify-center rounded-2xl text-4xl shadow-sm"
        style={{ background: gradient }}
      >
        <span>{safe.emoji ?? "🧠"}</span>
      </div>
      <p className="mt-2 text-sm font-black text-indigo-800">{name}</p>
      <p className="text-xs font-semibold text-slate-600">{safe.tagline ?? "Invat in fiecare zi."}</p>
      <p className="mt-1 text-xs text-slate-500">
        {(safe.accessories ?? []).slice(0, 3).join(" • ") || "fara accesorii"}
      </p>
    </div>
  );
}

export default function StudentsManagerPanel() {
  const [state, setState] = useState(() => loadStudentsState());
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("V");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [coins, setCoins] = useState(5);
  const [stars, setStars] = useState(1);
  const [badge, setBadge] = useState("Bravo");
  const [rewardReason, setRewardReason] = useState("Rezultate bune");
  const [avatarPrompt, setAvatarPrompt] = useState("hero calm, learning vibes");
  const [avatarPersonality, setAvatarPersonality] = useState("curios, perseverent");
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [battleA, setBattleA] = useState("");
  const [battleB, setBattleB] = useState("");
  const [battleMode, setBattleMode] = useState("rapid");

  const students = useMemo(
    () => (Array.isArray(state.students) ? state.students : []),
    [state.students],
  );
  const selectedStudent = students.find((student) => student.id === selectedStudentId) ?? null;

  useEffect(() => {
    if (!students.length) {
      setSelectedStudentId("");
      return;
    }
    const stillExists = students.some((student) => student.id === selectedStudentId);
    if (!stillExists) setSelectedStudentId(students[0].id);
  }, [selectedStudentId, students]);

  useEffect(() => {
    if (!students.length) {
      setBattleA("");
      setBattleB("");
      return;
    }
    if (!battleA) setBattleA(students[0].id);
    if (!battleB) setBattleB(students[1]?.id ?? students[0].id);
  }, [battleA, battleB, students]);

  const topStudents = useMemo(
    () =>
      [...students]
        .sort((a, b) => (b.battle?.rating ?? 0) - (a.battle?.rating ?? 0))
        .slice(0, 5),
    [students],
  );

  const refresh = (nextState, message = "") => {
    setState(nextState);
    if (message) setStatus(message);
  };

  const handleAddStudent = () => {
    const safeName = name.trim();
    if (!safeName) return;
    const next = addStudent({ name: safeName, grade });
    refresh(next, `Elev adaugat: ${safeName}`);
    setName("");
  };

  const handleRemoveStudent = (studentId) => {
    const target = students.find((student) => student.id === studentId);
    const next = removeStudent(studentId);
    refresh(next, `Elev eliminat: ${target?.name ?? "necunoscut"}`);
  };

  const handleGrantReward = () => {
    if (!selectedStudentId) return;
    const next = grantStudentReward(selectedStudentId, {
      coins,
      stars,
      badge: badge.trim(),
      reason: rewardReason.trim() || "Recompensa",
    });
    refresh(next, "Recompensa acordata.");
  };

  const handleRemoveReward = () => {
    if (!selectedStudentId) return;
    const next = removeStudentReward(selectedStudentId, {
      coins,
      stars,
      badge: badge.trim(),
      reason: rewardReason.trim() || "Retragere recompensa",
    });
    refresh(next, "Recompensa retrasa.");
  };

  const handleEditAvatarWithAi = async () => {
    if (!selectedStudent) return;
    setAvatarBusy(true);
    setStatus("");
    try {
      const result = await editStudentAvatar({
        studentName: selectedStudent.name,
        grade: selectedStudent.grade,
        personality: avatarPersonality.trim() || "curios si perseverent",
        stylePrompt: avatarPrompt.trim() || "friendly edu hero",
        currentAvatar: selectedStudent.avatar,
      });
      const next = updateStudentAvatar(selectedStudent.id, result.avatar);
      refresh(next, "Avatar actualizat de AI.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Avatar AI indisponibil.");
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleStartBattle = () => {
    if (!battleA || !battleB || battleA === battleB) {
      setStatus("Alege doi elevi diferiti pentru battle.");
      return;
    }
    const studentA = students.find((student) => student.id === battleA);
    const studentB = students.find((student) => student.id === battleB);
    if (!studentA || !studentB) return;

    const scoreA = Math.round(buildBattlePower(studentA));
    const scoreB = Math.round(buildBattlePower(studentB));
    const diff = Math.abs(scoreA - scoreB);
    const winnerId = diff <= 2 ? null : scoreA > scoreB ? studentA.id : studentB.id;
    const winner = winnerId ? students.find((student) => student.id === winnerId) : null;
    const summary = winner
      ? `${winner.name} castiga duelul ${battleMode}.`
      : "Battle terminat la egalitate.";

    let next = recordStudentBattle({
      studentAId: studentA.id,
      studentBId: studentB.id,
      winnerId,
      mode: battleMode,
      scoreA,
      scoreB,
      summary,
    });

    if (winnerId) {
      next = grantStudentReward(winnerId, {
        coins: 3,
        stars: 1,
        badge: `Campion ${battleMode}`,
        reason: "Victorie in battle",
      });
    }

    refresh(next, summary);
  };

  return (
    <div className="grid gap-4">
      <Card className="p-4">
        <p className="mb-3 text-base font-black text-indigo-800">Management elevi</p>
        <div className="grid gap-3 md:grid-cols-4">
          <label className="text-sm font-semibold text-indigo-700 md:col-span-2">
            Nume elev
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 w-full rounded-xl border border-indigo-200 px-3 py-2"
              placeholder="Ex: Andrei Popescu"
            />
          </label>
          <label className="text-sm font-semibold text-indigo-700">
            Clasa
            <select
              value={grade}
              onChange={(event) => setGrade(event.target.value)}
              className="mt-1 w-full rounded-xl border border-indigo-200 px-3 py-2"
            >
              <option value="V">V</option>
              <option value="VI">VI</option>
              <option value="VII">VII</option>
            </select>
          </label>
          <div className="flex items-end">
            <Button className="w-full" onClick={handleAddStudent}>
              <UserPlus size={16} /> Adauga elev
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {students.length > 0 ? (
            students.map((student) => (
              <div
                key={student.id}
                className={`rounded-2xl border p-3 ${
                  student.id === selectedStudentId
                    ? "border-indigo-300 bg-indigo-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedStudentId(student.id)}
                  className="w-full text-left"
                >
                  <p className="text-sm font-black text-slate-800">{student.name}</p>
                  <p className="text-xs font-semibold text-slate-500">Clasa {student.grade}</p>
                  <p className="mt-1 text-xs font-semibold text-indigo-700">
                    ⭐ {student.rewards.stars} • 🪙 {student.rewards.coins} • Rating {student.battle.rating}
                  </p>
                </button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 w-full text-rose-700"
                  onClick={() => handleRemoveStudent(student.id)}
                >
                  <Trash2 size={14} /> Elimina
                </Button>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-600">Nu exista elevi adaugati inca.</p>
          )}
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-4 xl:col-span-2">
          <p className="mb-3 flex items-center gap-2 text-base font-black text-indigo-800">
            <Gift size={18} /> Recompense elevi
          </p>
          <div className="grid gap-3 md:grid-cols-4">
            <label className="text-sm font-semibold text-indigo-700 md:col-span-2">
              Elev selectat
              <select
                value={selectedStudentId}
                onChange={(event) => setSelectedStudentId(event.target.value)}
                className="mt-1 w-full rounded-xl border border-indigo-200 px-3 py-2"
              >
                <option value="">Alege elev</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name} (clasa {student.grade})
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold text-indigo-700">
              Coins
              <input
                type="number"
                min={0}
                value={coins}
                onChange={(event) => setCoins(Number(event.target.value) || 0)}
                className="mt-1 w-full rounded-xl border border-indigo-200 px-3 py-2"
              />
            </label>
            <label className="text-sm font-semibold text-indigo-700">
              Stars
              <input
                type="number"
                min={0}
                value={stars}
                onChange={(event) => setStars(Number(event.target.value) || 0)}
                className="mt-1 w-full rounded-xl border border-indigo-200 px-3 py-2"
              />
            </label>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="text-sm font-semibold text-indigo-700">
              Badge
              <input
                value={badge}
                onChange={(event) => setBadge(event.target.value)}
                className="mt-1 w-full rounded-xl border border-indigo-200 px-3 py-2"
              />
            </label>
            <label className="text-sm font-semibold text-indigo-700">
              Motiv
              <input
                value={rewardReason}
                onChange={(event) => setRewardReason(event.target.value)}
                className="mt-1 w-full rounded-xl border border-indigo-200 px-3 py-2"
              />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={handleGrantReward} disabled={!selectedStudentId}>
              <PlusCircle size={16} /> Acorda recompensa
            </Button>
            <Button variant="secondary" onClick={handleRemoveReward} disabled={!selectedStudentId}>
              <MinusCircle size={16} /> Retrage recompensa
            </Button>
          </div>
          {status ? (
            <p className="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
              {status}
            </p>
          ) : null}
        </Card>

        <Card className="p-4">
          <p className="mb-3 flex items-center gap-2 text-base font-black text-indigo-800">
            <Bot size={18} /> Avatar AI
          </p>
          {selectedStudent ? (
            <>
              <AvatarPreview avatar={selectedStudent.avatar} name={selectedStudent.name} />
              <label className="mt-3 block text-sm font-semibold text-indigo-700">
                Personalitate
                <input
                  value={avatarPersonality}
                  onChange={(event) => setAvatarPersonality(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-indigo-200 px-3 py-2"
                />
              </label>
              <label className="mt-2 block text-sm font-semibold text-indigo-700">
                Stil avatar
                <input
                  value={avatarPrompt}
                  onChange={(event) => setAvatarPrompt(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-indigo-200 px-3 py-2"
                />
              </label>
              <Button className="mt-3 w-full" onClick={handleEditAvatarWithAi} disabled={avatarBusy}>
                {avatarBusy ? "Se genereaza..." : "Editeaza avatar cu AI"}
              </Button>
            </>
          ) : (
            <p className="text-sm text-slate-600">Selecteaza un elev pentru avatar AI.</p>
          )}
        </Card>
      </div>

      <Card className="p-4">
        <p className="mb-3 flex items-center gap-2 text-base font-black text-indigo-800">
          <Swords size={18} /> Battle intre elevi
        </p>
        <div className="grid gap-3 md:grid-cols-4">
          <label className="text-sm font-semibold text-indigo-700">
            Elev A
            <select
              value={battleA}
              onChange={(event) => setBattleA(event.target.value)}
              className="mt-1 w-full rounded-xl border border-indigo-200 px-3 py-2"
            >
              <option value="">Alege</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-indigo-700">
            Elev B
            <select
              value={battleB}
              onChange={(event) => setBattleB(event.target.value)}
              className="mt-1 w-full rounded-xl border border-indigo-200 px-3 py-2"
            >
              <option value="">Alege</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-indigo-700">
            Mod
            <select
              value={battleMode}
              onChange={(event) => setBattleMode(event.target.value)}
              className="mt-1 w-full rounded-xl border border-indigo-200 px-3 py-2"
            >
              <option value="rapid">Rapid</option>
              <option value="strategy">Strategy</option>
              <option value="duel">Duel</option>
            </select>
          </label>
          <div className="flex items-end">
            <Button className="w-full" onClick={handleStartBattle}>
              <Swords size={16} /> Start battle
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {state.battles?.length ? (
            state.battles.slice(0, 6).map((battle) => {
              const studentA = students.find((student) => student.id === battle.studentAId);
              const studentB = students.find((student) => student.id === battle.studentBId);
              const winner = students.find((student) => student.id === battle.winnerId);
              return (
                <div key={battle.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold text-slate-500">
                    {new Date(battle.dateISO).toLocaleString("ro-RO")} • {battle.mode}
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-800">
                    {studentA?.name ?? "Elev A"} ({battle.scoreA}) vs {studentB?.name ?? "Elev B"} ({battle.scoreB})
                  </p>
                  <Badge variant={winner ? "emerald" : "slate"}>
                    {winner ? `Castigator: ${winner.name}` : "Egalitate"}
                  </Badge>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-slate-600">Nu exista battle-uri inregistrate inca.</p>
          )}
        </div>

        <div className="mt-4">
          <p className="text-sm font-black text-indigo-800">Top elevi dupa rating</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {topStudents.map((student, index) => (
              <Badge key={student.id} variant={index === 0 ? "emerald" : "indigo"}>
                #{index + 1} {student.name} • {student.battle.rating}
              </Badge>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
