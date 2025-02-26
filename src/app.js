import express from 'express'
// import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import mongoSanitize from 'express-mongo-sanitize'
// import xss from 'xss'
// import hpp from "hpp";
import cors from 'cors'
import globalErrorHandler from './Middlewares/globalErrorHandler.js'
// import cookieParser from 'cookie-parser'
// import authRoutes from './routes/authRoutes'
// import userRoutes from './routes/userRoutes'
// import requestLogger from './utils/requestLogger'


const app = express()

// 1) GLOBAL MIDDLEWARES
// Set security HTTP headers
app.use(helmet())

// Limit requests from same API
// const limiter = rateLimit({
//     max: 500,
//     windowMs: 60 * 60 * 1000,
//     message: 'Too many requests from this IP, please try again in an hour!'
// })
// app.use('/api', limiter)

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '16kb' }))

// Middleware to handle URL-encoded data
app.use(express.urlencoded({ extended: true }))

// Parse cookies
// app.use(cookieParser() as express.RequestHandler)

// Data sanitization against NoSQL query injection
app.use(mongoSanitize())

// Data sanitization against XSS
// app.use(xss())

// Prevent parameter pollution
// app.use(
//   hpp({
//     whitelist: [
//     ],
//   })
// );

const corsOptions = {
    origin: [process.env.FRONTEND_URL],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    credentials: true
}

app.use(cors(corsOptions))

// 3) ROUTES
app.get('/', (req, res) => {
    res.status(200).json({ message: 'Welcome to the GHG API 🚀. Running in ECS 🎉' })
})

app.get('/health', (req, res) => {
    res.status(200).json({ message: 'Everything is good here 👀' })
})

// app.use('/api/v1/auth', authRoutes)
// app.use('/api/v1/users', userRoutes)

// 4) CATCHES ALL ROUTES THAT ARE NOT DEFINED
app.all('*', (req, res, next) => {
    httpError(next, new Error(`Can't find ${req.originalUrl} on this server!`), req, 404)
})

app.use(globalErrorHandler)

const server = app
export default server


