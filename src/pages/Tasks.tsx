import { useAuth } from "../auth/AuthProvider";
import { useTasks } from "../hooks/useTasks";
import { TaskForm } from "../components/tasks/TaskForm";

export default function Tasks() {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const { loading, addTask } = useTasks(userId);

  return (
    <section className="page">
      <div className="card">
        <h2>タスクを追加</h2>
        <TaskForm submitting={loading} onSubmit={addTask} />
      </div>
    </section>
  );
}
