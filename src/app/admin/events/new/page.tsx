import { requireAdminPage } from "@/lib/auth";
import { EventEditor } from "@/components/events/editor";
export const dynamic = "force-dynamic";
export default async function NewEvent() {
  if (!(await requireAdminPage())) return <h1>需要管理员权限</h1>;
  return (
    <>
      <h1>收录一场开发实践</h1>
      <EventEditor />
    </>
  );
}
