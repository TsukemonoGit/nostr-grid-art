// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these characteristics
declare global {
	interface Window {
		nostr: {
			getPublicKey: () => Promise<string>;
			signEvent: (event: {
				kind: number;
				created_at: number;
				tags: string[][];
				content: string;
			}) => Promise<any>;
			encrypt: (pubkey: string, plaintext: string) => Promise<string>;
			decrypt: (pubkey: string, ciphertext: string) => Promise<string>;
			getRelays?: () => Promise<Record<string, { read: boolean; write: boolean }>>;
		};
	}

	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
