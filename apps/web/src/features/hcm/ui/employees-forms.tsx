import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { createEmployeeSchema, createProjectAssignmentSchema } from '@aec/api-contracts';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import { useLegalEntities } from '@/entities/legal-entity';
import { useProjects } from '@/entities/project';
import { useCreateAssignment, useCreateEmployee } from '../model/hcm.api';
import type { Employee } from '@aec/api-contracts';

const employeeSchema = z.object({
  legalEntityId: z.string().min(1, 'Legal entity is required'),
  name: createEmployeeSchema.shape.name,
  position: createEmployeeSchema.shape.position,
  grade: createEmployeeSchema.shape.grade,
  department: createEmployeeSchema.shape.department,
});
type EmployeeValues = z.infer<typeof employeeSchema>;

export function EmployeeForm({ onDone }: { onDone: () => void }) {
  const entities = useLegalEntities({ page: 1, pageSize: 100 });
  const create = useCreateEmployee();
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<EmployeeValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: { legalEntityId: '', name: '', position: '', grade: '', department: '' },
  });

  const onSubmit = handleSubmit((input) =>
    create.mutate(
      {
        legalEntityId: input.legalEntityId,
        name: input.name,
        position: input.position,
        grade: input.grade || undefined,
        department: input.department || undefined,
      },
      { onSuccess: () => { reset(); onDone(); } },
    )
  );

  return (
    <form onSubmit={onSubmit} className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="emp-entity">Legal Entity <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Controller name="legalEntityId" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="emp-entity">
                <SelectValue placeholder="Select entity…" />
              </SelectTrigger>
              <SelectContent>
                {(entities.data?.items ?? []).map((e) => <SelectItem key={e.id} value={e.id}>{e.code} - {e.legalName}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
          {errors.legalEntityId && <p className="mt-1 text-caption text-destructive-600">{errors.legalEntityId.message}</p>}
        </div>
        <div>
          <Label htmlFor="emp-name">Name <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="emp-name" error={!!errors.name} {...register('name')} />
          {errors.name && <p className="mt-1 text-caption text-destructive-600">{errors.name.message}</p>}
        </div>
        <div>
          <Label htmlFor="emp-pos">Position <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="emp-pos" placeholder="e.g. Site Engineer" error={!!errors.position} {...register('position')} />
          {errors.position && <p className="mt-1 text-caption text-destructive-600">{errors.position.message}</p>}
        </div>
        <div>
          <Label htmlFor="emp-grade">Grade</Label>
          <Input id="emp-grade" placeholder="e.g. E3" error={!!errors.grade} {...register('grade')} />
          {errors.grade && <p className="mt-1 text-caption text-destructive-600">{errors.grade.message}</p>}
        </div>
        <div>
          <Label htmlFor="emp-dept">Department</Label>
          <Input id="emp-dept" placeholder="e.g. Construction" error={!!errors.department} {...register('department')} />
          {errors.department && <p className="mt-1 text-caption text-destructive-600">{errors.department.message}</p>}
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" loading={create.isPending}>Create Employee</Button>
      </div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600" role="alert">Failed to create the employee.</p>}
    </form>
  );
}

const assignmentSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  role: createProjectAssignmentSchema.shape.role,
  allocationPercent: z.string().min(1, 'Allocation is required')
    .refine((v) => Number(v) >= 1 && Number(v) <= 100, 'Allocation must be 1–100'),
  exception: z.boolean(),
});
type AssignmentValues = z.infer<typeof assignmentSchema>;

export function AssignmentForm({ employee }: { employee: Employee }) {
  const projects = useProjects({ page: 1, pageSize: 100 });
  const create = useCreateAssignment();
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<AssignmentValues>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: { projectId: '', role: '', allocationPercent: '', exception: false },
  });

  const onSubmit = handleSubmit((input) =>
    create.mutate(
      {
        employeeId: employee.id,
        projectId: input.projectId,
        role: input.role || undefined,
        allocationPercent: Number(input.allocationPercent),
        exceptionApproved: input.exception || undefined,
      },
      { onSuccess: () => { reset(); } },
    )
  );

  return (
    <form onSubmit={onSubmit} className="mt-4 flex flex-wrap items-end gap-2 border-t border-neutral-100 pt-4">
      <div>
        <Label htmlFor="asg-project">Project <span aria-hidden="true" className="text-destructive-600">*</span></Label>
        <Controller name="projectId" control={control} render={({ field }) => (
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger id="asg-project">
              <SelectValue placeholder="Select project…" />
            </SelectTrigger>
            <SelectContent>
              {(projects.data?.items ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.code}</SelectItem>)}
            </SelectContent>
          </Select>
        )} />
        {errors.projectId && <p className="mt-1 text-caption text-destructive-600">{errors.projectId.message}</p>}
      </div>
      <div>
        <Label htmlFor="asg-role">Role</Label>
        <Input id="asg-role" placeholder="e.g. Site Engineer" error={!!errors.role} {...register('role')} />
        {errors.role && <p className="mt-1 text-caption text-destructive-600">{errors.role.message}</p>}
      </div>
      <div>
        <Label htmlFor="asg-alloc">Allocation (%) <span aria-hidden="true" className="text-destructive-600">*</span></Label>
        <Input id="asg-alloc" type="number" min={1} max={100} placeholder="e.g. 50" error={!!errors.allocationPercent} {...register('allocationPercent')} />
        {errors.allocationPercent && <p className="mt-1 text-caption text-destructive-600">{errors.allocationPercent.message}</p>}
      </div>
      <Controller name="exception" control={control} render={({ field }) => (
        <label className="flex h-9 items-center gap-2 text-body-sm text-neutral-600">
          <input type="checkbox" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />
          Exception &gt;100%
        </label>
      )} />
      <Button type="submit" loading={create.isPending}>Add Assignment</Button>
      {create.isError && <p className="text-caption text-destructive-600" role="alert">Failed (possibly allocation &gt;100% without exception).</p>}
    </form>
  );
}
