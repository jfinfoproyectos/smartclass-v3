import { useState, useEffect } from "react";

export function useCooldown(lastSubmittedAt?: string | Date | null, cooldownMinutes: number = 5) {
    const [remainingTime, setRemainingTime] = useState<string>("");
    const [isCooldownActive, setIsCooldownActive] = useState<boolean>(false);

    useEffect(() => {
        if (!lastSubmittedAt) {
            setIsCooldownActive(false);
            setRemainingTime("");
            return;
        }

        const calculateTimeLeft = () => {
            const now = new Date().getTime();
            const lastSubmitTime = new Date(lastSubmittedAt).getTime();
            const cooldownMs = cooldownMinutes * 60 * 1000;
            const targetTime = lastSubmitTime + cooldownMs;

            const difference = targetTime - now;

            if (difference <= 0) {
                setIsCooldownActive(false);
                setRemainingTime("");
                return false;
            }

            const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((difference % (1000 * 60)) / 1000);

            setRemainingTime(`${minutes}m ${seconds}s`);
            setIsCooldownActive(true);
            return true;
        };

        // Initial check
        const isActive = calculateTimeLeft();
        if (!isActive) return;

        const intervalId = setInterval(() => {
            calculateTimeLeft();
        }, 1000);

        return () => clearInterval(intervalId);
    }, [lastSubmittedAt, cooldownMinutes]);

    return { isCooldownActive, remainingTime };
}
