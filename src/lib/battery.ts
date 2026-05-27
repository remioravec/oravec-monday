/**
 * Calcul de la batterie PRÉDICTIVE (cf. §3.2) : pour chaque membre, somme des
 * coûts des tâches qui lui sont assignées et non encore terminées sur le cycle.
 * MVP : approximation = toutes les tâches non "done" assignées (le découpage fin
 * par cycle quotidien/hebdo viendra avec battery_snapshots, tâche #6).
 */

export interface TaskForBattery {
  battery_cost: number;
  status: string;
  task_assignees: { profile_id: string }[];
}

export function computeBatteries(
  profileIds: string[],
  tasks: TaskForBattery[],
): Record<string, number> {
  const totals: Record<string, number> = Object.fromEntries(
    profileIds.map((id) => [id, 0]),
  );

  for (const task of tasks) {
    if (task.status === "done") continue;
    for (const { profile_id } of task.task_assignees) {
      if (profile_id in totals) {
        totals[profile_id] += task.battery_cost;
      }
    }
  }

  // Plafonné à 100 % pour l'affichage.
  for (const id of Object.keys(totals)) {
    totals[id] = Math.min(100, totals[id]);
  }
  return totals;
}
