import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';

/** Klien Prisma biasa atau klien transaksi — keduanya punya API model yang sama. */
type Db = PrismaService | Prisma.TransactionClient;

/**
 * Satu-satunya tempat yang menerjemahkan "role aktif yang dipegang seseorang"
 * menjadi keputusan. Sebelumnya query yang sama (OR `effectiveTo` null/`gt now`)
 * disalin di lima tempat (approval-task, workflow-definition, workflow-insights)
 * dengan pesan error yang sedikit berbeda-beda — sumber divergensi.
 *
 * Dua rasa error dipertahankan persis seperti asalnya:
 * - `assertRoleExists` / `requireHolder` → `ConflictException` (dipakai saat menulis
 *   langkah & membuka langkah berikutnya).
 * - `findRoleOrNotFound` → `NotFoundException` (dipakai `resolveApproverId`).
 */
@Injectable()
export class RoleAssignmentLookup {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /** Predikat "assignment masih berlaku pada `now`". */
  activeWhere(roleId: string, now: Date = new Date()): Prisma.UserRoleWhereInput {
    return { roleId, OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }] };
  }

  /** Role berdasarkan kode, atau `null` bila tak ada. */
  findRole(roleCode: string, db: Db = this.prisma) {
    return db.role.findUnique({ where: { code: roleCode } });
  }

  /** Role atau lempar `ROLE_NOT_FOUND` sebagai `NotFoundException`. */
  async findRoleOrNotFound(roleCode: string, db: Db = this.prisma) {
    const role = await this.findRole(roleCode, db);
    if (!role) throw new NotFoundException({ code: 'ROLE_NOT_FOUND', message: `Approver role ${roleCode} not found` });
    return role;
  }

  /** Role atau lempar `ROLE_NOT_FOUND` sebagai `ConflictException` (semantik tulis langkah). */
  async assertRoleExists(roleCode: string, db: Db = this.prisma) {
    const role = await this.findRole(roleCode, db);
    if (!role) throw new ConflictException({ code: 'ROLE_NOT_FOUND', message: `Approver role ${roleCode} not found` });
    return role;
  }

  /** Assignment aktif pertama (paling awal `effectiveFrom`) untuk sebuah role. */
  findActiveAssignment(roleId: string, db: Db = this.prisma) {
    return db.userRole.findFirst({
      where: this.activeWhere(roleId),
      orderBy: { effectiveFrom: 'asc' },
    });
  }

  /** Pastikan role ada DAN dipegang seseorang — kalau tidak rantai akan macet. */
  async requireHolder(roleCode: string, db: Db = this.prisma) {
    const role = await this.assertRoleExists(roleCode, db);
    const assignment = await this.findActiveAssignment(role.id, db);
    if (!assignment) throw new ConflictException({ code: 'NO_APPROVER', message: `No user holds role ${roleCode}` });
    return assignment;
  }

  /** Apakah `userId` memegang `roleCode` (secara aktif). */
  async hasRole(userId: string, roleCode: string, db: Db = this.prisma): Promise<boolean> {
    const role = await this.findRole(roleCode, db);
    if (!role) return false;
    const assignment = await db.userRole.findFirst({
      where: { userId, ...this.activeWhere(role.id) },
    });
    return !!assignment;
  }

  /** Kode role yang aktif dipegang user — dasar untuk menentukan `canApprove`. */
  async roleCodesOf(userId: string): Promise<string[]> {
    const assignments = await this.prisma.userRole.findMany({
      where: { userId, OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }] },
      include: { role: true },
    });
    return assignments.map((a) => a.role.code);
  }
}
