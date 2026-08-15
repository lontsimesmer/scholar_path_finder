import { useEffect } from "react";

type JsonLdSchema = Record<string, unknown>;

export const useJsonLd = (id: string, schemas: JsonLdSchema | JsonLdSchema[] | null) => {
  useEffect(() => {
    if (!schemas || (Array.isArray(schemas) && schemas.length === 0)) {
      return undefined;
    }

    const scriptId = `jsonld-${id}`;
    let script = document.head.querySelector<HTMLScriptElement>(`script[data-jsonld="${scriptId}"]`);

    if (!script) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.dataset.jsonld = scriptId;
      document.head.appendChild(script);
    }

    script.textContent = JSON.stringify(schemas);

    return () => {
      script?.parentNode?.removeChild(script);
    };
  }, [id, schemas]);
};
