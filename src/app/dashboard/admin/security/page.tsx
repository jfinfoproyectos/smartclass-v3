import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SecurityPanel } from "@/features/admin/components/SecurityPanel";
import {
    getSecurityOverviewAction,
    getBlockedIpsAction,
    getWhitelistedIpsAction,
    getSecurityAttackLogsAction,
    getCurrentAdminIpAction,
} from "@/features/admin/actions/securityActions";

export const metadata = {
    title: "Seguridad de Red & Firewall de IPs | SmartClass Admin",
    description: "Defensa contra ataques de IP, mitigación DDoS, detección de fuerza bruta y control de accesos perimetrales.",
};

export default async function AdminSecurityPage() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session || session.user.role !== "admin") {
        redirect("/dashboard");
    }

    const [overview, blockedIps, whitelistedIps, attackLogs, currentAdminIp] = await Promise.all([
        getSecurityOverviewAction(),
        getBlockedIpsAction(),
        getWhitelistedIpsAction(),
        getSecurityAttackLogsAction({ page: 1, limit: 25 }),
        getCurrentAdminIpAction(),
    ]);

    return (
        <div className="container mx-auto py-6">
            <SecurityPanel
                initialOverview={overview}
                initialBlockedIps={blockedIps}
                initialWhitelistedIps={whitelistedIps}
                initialAttackLogs={attackLogs}
                currentAdminIp={currentAdminIp}
            />
        </div>
    );
}
