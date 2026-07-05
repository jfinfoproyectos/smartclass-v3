"use server";

/**
 * Shortens a URL using the TinyURL API.
 * This is a server action to avoid CORS issues on the client.
 */
export async function shortenUrl(longUrl: string): Promise<string | null> {
    try {
        const response = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`);
        if (response.ok) {
            const shortUrl = await response.text();
            return shortUrl;
        }
        return null;
    } catch (error) {
        console.error("Error shortening URL:", error);
        return null;
    }
}
