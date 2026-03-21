import { InferenceExperienceProvider } from "../context/InferenceExperienceContext";
import InferenceDashboard from "./InferenceDashboard";

export default function Inference() {
  return (
    <InferenceExperienceProvider>
      <InferenceDashboard />
    </InferenceExperienceProvider>
  );
}
