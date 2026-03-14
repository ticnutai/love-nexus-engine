import { motion } from "framer-motion";
import { Heart, MapPin, BookOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MatchCardProps {
  name: string;
  age: number;
  city: string;
  occupation: string;
  compatibility: number;
  values: string[];
  avatar: string;
  onViewProfile: () => void;
  index: number;
}

const MatchCard = ({ name, age, city, occupation, compatibility, values, avatar, onViewProfile, index }: MatchCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="bg-card rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 overflow-hidden group"
      dir="rtl"
    >
      {/* Compatibility badge */}
      <div className="relative p-6 pb-4">
        <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/10 text-success">
          <Sparkles className="w-3.5 h-3.5" />
          <span className="text-sm font-bold">{compatibility}%</span>
        </div>

        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted flex-shrink-0">
            <img src={avatar} alt={name} className="w-full h-full object-cover" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-foreground">{name}, {age}</h3>
            <div className="flex items-center gap-1.5 text-muted-foreground mt-1">
              <MapPin className="w-3.5 h-3.5" />
              <span className="text-sm">{city}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground mt-0.5">
              <BookOpen className="w-3.5 h-3.5" />
              <span className="text-sm">{occupation}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Values */}
      <div className="px-6 pb-4">
        <div className="flex flex-wrap gap-2">
          {values.map((value, i) => (
            <span
              key={i}
              className="px-2.5 py-1 text-xs rounded-full bg-primary/8 text-primary font-medium"
            >
              {value}
            </span>
          ))}
        </div>
      </div>

      {/* Action */}
      <div className="px-6 pb-6">
        <Button
          variant="outline"
          className="w-full gap-2 group-hover:border-primary group-hover:text-primary transition-colors"
          onClick={onViewProfile}
        >
          <Heart className="w-4 h-4" />
          צפו בפרופיל המלא
        </Button>
      </div>
    </motion.div>
  );
};

export default MatchCard;
