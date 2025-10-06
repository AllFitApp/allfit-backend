import express from 'express';
import FeedbackController from '../../../../infra/controller/FeedbackController';

const feedbackRouter = express.Router();

feedbackRouter.post('/', FeedbackController.create);

export default feedbackRouter;