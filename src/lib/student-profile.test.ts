import { describe, expect, it } from "vitest";

import { buildStudentFullName, splitStudentFullName } from "@/lib/student-profile";

describe("student-profile helpers", () => {
  it("builds a full name from first and last names", () => {
    expect(buildStudentFullName("Jean", "Dupont")).toBe("Jean Dupont");
  });

  it("splits a full name into first and last names", () => {
    expect(splitStudentFullName("Jean Michel Dupont")).toEqual({
      firstName: "Jean Michel",
      lastName: "Dupont",
    });
  });

  it("keeps a single token as the first name", () => {
    expect(splitStudentFullName("Amina")).toEqual({
      firstName: "Amina",
      lastName: "",
    });
  });
});
