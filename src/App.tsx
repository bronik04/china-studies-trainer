import { regions } from './content/regions';
import { TopicSelectionPage } from './features/topic-selection/TopicSelectionPage';

export default function App() {
  return <TopicSelectionPage regions={regions} />;
}
